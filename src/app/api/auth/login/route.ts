// ============================================================================
// FILE: src/app/api/auth/login/route.ts
// FUNGSI: Endpoint API untuk LOGIN. Alamatnya: POST /notes/api/auth/login
//
// CARA KERJA ROUTING NEXT.JS (PENTING UNTUK PROGRAMMER PHP!):
// - Di PHP, URL diarahkan ke file .php (misal /api/login.php).
// - Di Next.js App Router, struktur FOLDER menentukan URL:
//     src/app/api/auth/login/route.ts  ->  /api/auth/login
// - Nama fungsi (POST, GET, PATCH, DELETE) menentukan HTTP method-nya.
//   Mirip seperti: if ($_SERVER['REQUEST_METHOD'] === 'POST') { ... }
// ============================================================================

// timingSafeEqual: membandingkan dua string dengan waktu konstan,
// supaya hacker tidak bisa menebak password lewat perbedaan waktu respons
// (timing attack). Di PHP mirip dengan hash_equals().
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { COOKIE_NAME, cookieMaxAge, createToken } from "@/lib/auth";
import { checkRateLimit, clearFailures, recordFailure } from "@/lib/rate-limit";
import { getPasswordRecord } from "@/lib/settings";

// ----------------------------------------------------------------------------
// Fungsi: passwordMatches(input, expected)
// Membandingkan password dari user dengan password tersimpan secara aman.
// ----------------------------------------------------------------------------
function passwordMatches(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  // Panjang harus sama DAN isinya identik (dibandingkan byte per byte)
  return inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);
}

// ----------------------------------------------------------------------------
// Fungsi: passwordRecordMatches(input, record)
// Cek password terhadap penyimpanan yang aktif:
//   1. Kalau password sudah pernah diganti lewat menu Pengaturan -> pakai hash
//      PBKDF2 di tabel settings (verifyPin menerima format hash yang sama).
//   2. Kalau belum -> pakai NOTES_PASSWORD dari .env (masih plaintext).
// ----------------------------------------------------------------------------
async function passwordRecordMatches(input: string) {
  const record = await getPasswordRecord();

  if (record.hash) {
    // verifyPin dipakai ulang: format hash-nya sama (pbkdf2_sha256$...)
    const { verifyPin } = await import("@/lib/pin");
    return verifyPin(input, record.hash);
  }

  return record.plainEnv ? passwordMatches(input, record.plainEnv) : false;
}

// ----------------------------------------------------------------------------
// Handler HTTP POST — dijalankan saat ada request POST ke /api/auth/login
// "export async function POST" mirip blok if POST di PHP.
// ----------------------------------------------------------------------------
export async function POST(request: Request) {
  // 1. Ambil alamat IP pengunjung (untuk rate limiting).
  //    "cf-connecting-ip" = header dari Cloudflare, "x-forwarded-for" = dari proxy.
  //    Di PHP mirip: $_SERVER['REMOTE_ADDR']
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";

  // 2. Cek rate limit: kalau IP ini sudah gagal login 5x dalam 5 menit, tolak.
  const limit = checkRateLimit(ip);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } } // 429 = Too Many Requests
    );

  // 3. Validasi body request: harus berisi { "password": "..." } (1-256 karakter).
  //    ".catch(() => null)" = kalau body-nya bukan JSON valid, anggap null.
  const parsed = z.object({ password: z.string().min(1).max(256) }).safeParse(await request.json().catch(() => null));

  // 4. Kalau validasi gagal -> catat kegagalan, balas 401
  if (!parsed.success) {
    recordFailure(ip);
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  // 5. Bandingkan dengan password yang tersimpan (tabel settings dulu,
  //    kalau belum pernah diganti baru pakai NOTES_PASSWORD dari .env).
  //    Kalau tidak cocok -> catat kegagalan, balas 401
  if (!(await passwordRecordMatches(parsed.data.password))) {
    recordFailure(ip);
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  // 6. Login BERHASIL: hapus catatan kegagalan, buat token JWT
  clearFailures(ip);
  const token = await createToken();

  // 7. Kirim token ke client DAN simpan di cookie browser (httpOnly agar
  //    tidak bisa dicuri lewat JavaScript/XSS). Masa berlaku cookie disamakan
  //    dengan masa berlaku token (lihat SESSION_DURATION di lib/auth.ts).
  //    Di PHP mirip: setcookie('mynotes_session', $token, [...])
  const response = NextResponse.json({ data: { token }, server_time: new Date().toISOString() });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,                                  // cookie tidak bisa dibaca JavaScript (anti XSS)
    secure: process.env.NODE_ENV === "production",   // hanya via HTTPS di production
    sameSite: "lax",                                 // perlindungan dasar dari serangan CSRF
    path: "/",
    maxAge: cookieMaxAge(),                          // ikut SESSION_DURATION
  });
  return response;
}
