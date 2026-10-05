// ============================================================================
// FILE: src/app/api/auth/change-password/route.ts
// FUNGSI: Mengganti password aplikasi.
//         POST /notes/api/auth/change-password
//         Body: { pin, current_password, new_password, confirm_password }
//
// KEAMANAN (berlapis):
// 1. Harus sudah login (token JWT valid).
// 2. WAJIB menyertakan PIN verifikasi yang benar.
// 3. WAJIB tahu password lama (kalau sesi dipakai orang lain, tetap tidak bisa
//    mengganti password tanpa PIN + password lama).
// 4. Password baru minimal 8 karakter dan dua kali penulisannya harus sama.
// 5. Rate-limit 5x gagal per 5 menit (per IP) supaya PIN tidak bisa ditebak.
// 6. Password baru disimpan sebagai HASH (PBKDF2), bukan plaintext.
// ============================================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { unauthorized } from "@/lib/http";
import { checkRateLimit, clearFailures, recordFailure } from "@/lib/rate-limit";
import { hashPin, verifyPin } from "@/lib/pin";
import {
  KEY_PASSWORD_HASH,
  getOrInitPinHash,
  getPasswordRecord,
  isPinDefault,
  setSetting,
} from "@/lib/settings";

// ----------------------------------------------------------------------------
// Fungsi: samePassword(input, record)
// Cek apakah input sama dengan password yang SEDANG berlaku.
// - Sudah pernah diganti -> dibandingkan dengan hash di tabel settings.
// - Belum pernah         -> dibandingkan dengan NOTES_PASSWORD di .env.
// ----------------------------------------------------------------------------
async function sameAsCurrentPassword(input: string) {
  const record = await getPasswordRecord();
  if (record.hash) return verifyPin(input, record.hash);
  return record.plainEnv !== null && input === record.plainEnv;
}

// Skema validasi body. PIN 4-6 digit angka (format yang sama dengan PIN catatan).
const bodySchema = z
  .object({
    pin: z.string().regex(/^\d{4,6}$/, "PIN harus 4-6 digit angka"),
    current_password: z.string().min(1, "Password lama wajib diisi").max(256),
    new_password: z.string().min(8, "Password baru minimal 8 karakter").max(256),
    confirm_password: z.string().min(1, "Konfirmasi password wajib diisi").max(256),
  })
  .strict();

export async function POST(request: Request) {
  // 1. Wajib sudah login
  if (!(await isAuthenticated(request))) return unauthorized();

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    "local";

  // 2. Rate-limit khusus untuk percobaan ganti password
  const limit = checkRateLimit(`cp:${ip}`);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );

  // 3. Validasi isi form
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    recordFailure(`cp:${ip}`);
    const pesan = parsed.error.issues[0]?.message ?? "Data tidak valid.";
    return NextResponse.json({ error: pesan }, { status: 400 });
  }

  const { pin, current_password, new_password, confirm_password } = parsed.data;

  // 4. Pastikan PIN verifikasi benar
  const pinHash = await getOrInitPinHash();
  if (!pinHash) {
    // PIN belum pernah dikonfigurasi di server ini.
    return NextResponse.json(
      { error: "PIN verifikasi belum diatur di server. Setel NOTES_DEFAULT_PIN lebih dulu." },
      { status: 409 }
    );
  }
  if (!verifyPin(pin, pinHash)) {
    recordFailure(`cp:${ip}`);
    return NextResponse.json({ error: "PIN salah." }, { status: 401 });
  }

  // 5. Pastikan password lama benar
  if (!(await sameAsCurrentPassword(current_password))) {
    recordFailure(`cp:${ip}`);
    return NextResponse.json({ error: "Password lama salah." }, { status: 401 });
  }

  // 6. Pastikan password baru & konfirmasinya sama
  if (new_password !== confirm_password) {
    recordFailure(`cp:${ip}`);
    return NextResponse.json({ error: "Konfirmasi password tidak sama." }, { status: 400 });
  }

  // 7. Password baru tidak boleh sama dengan password lama
  if (await sameAsCurrentPassword(new_password)) {
    return NextResponse.json(
      { error: "Password baru tidak boleh sama dengan password lama." },
      { status: 400 }
    );
  }

  // 8. Simpan password baru sebagai hash PBKDF2
  try {
    await setSetting(KEY_PASSWORD_HASH, hashPin(new_password));
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan password baru." }, { status: 500 });
  }

  // 9. Berhasil -> reset hitungan gagal
  clearFailures(`cp:${ip}`);
  return NextResponse.json({ data: { changed: true } });
}

// ----------------------------------------------------------------------------
// GET: cek status PIN (apakah masih PIN awal atau sudah diganti pemilik).
// Tidak pernah mengembalikan nilai PIN-nya, hanya status.
// Wajib login, sama seperti endpoint lain.
// ----------------------------------------------------------------------------
export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) return unauthorized();
  const masihAwal = await isPinDefault();
  return NextResponse.json({ data: { pin_is_default: masihAwal } });
}
