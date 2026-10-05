// ============================================================================
// FILE: src/lib/auth.ts
// FUNGSI: Mengatur autentikasi (login) menggunakan JWT (JSON Web Token).
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Ini mirip seperti file "auth.php" yang biasa kita buat untuk cek session.
// - Bedanya di sini kita pakai JWT (token terenkripsi), bukan $_SESSION PHP.
// - JWT disimpan di cookie browser, lalu diverifikasi setiap ada request API.
// ============================================================================

// "cookies" adalah helper bawaan Next.js untuk membaca cookie dari request.
// Di PHP ini mirip dengan $_COOKIE.
import { cookies } from "next/headers";

// "jose" adalah library untuk membuat (sign) dan memverifikasi JWT.
// Di PHP biasanya kita pakai library firebase/php-jwt.
import { SignJWT, jwtVerify } from "jose";

// Nama cookie yang dipakai untuk menyimpan token sesi login.
// Mirip seperti session_name() di PHP.
export const COOKIE_NAME = "mynotes_session";

// Fungsi untuk mengambil "kunci rahasia" dari file .env (JWT_SECRET).
// Kunci ini dipakai untuk menandatangani & memverifikasi token.
// TextEncoder mengubah string menjadi bytes, karena library jose butuh bytes.
// Di PHP ini mirip: getenv('JWT_SECRET')
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

// ----------------------------------------------------------------------------
// Konstanta masa berlaku sesi.
// Dulu 30 hari; diperpanjang menjadi 365 hari supaya aplikasi mobile tidak
// ter-logout sendiri setiap bulan. Sesi tetap bisa diputus kapan saja dengan
// mengganti JWT_SECRET di .env (semua token lama langsung tidak berlaku).
// Angka ini dipakai konsisten oleh createToken() dan cookieMaxAge().
// ----------------------------------------------------------------------------
export const SESSION_DURATION = "365d";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 365;

// ----------------------------------------------------------------------------
// Fungsi: cookieMaxAge()
// Masa berlaku cookie (detik). Sengaja disamakan dengan masa berlaku token
// supaya cookie tidak kedaluwarsa mendahului tokennya.
// ----------------------------------------------------------------------------
export const cookieMaxAge = () => SESSION_DURATION_SECONDS;

// ----------------------------------------------------------------------------
// Fungsi: createToken()
// Dipanggil saat user berhasil login. Membuat token JWT baru.
// ----------------------------------------------------------------------------
export async function createToken() {
  return new SignJWT({ role: "owner" })        // Data (payload) yang disimpan dalam token
    .setProtectedHeader({ alg: "HS256" })       // Algoritma enkripsi HS256 (HMAC + SHA256)
    .setIssuedAt()                              // Catat waktu token dibuat
    .setExpirationTime(SESSION_DURATION)        // Token kedaluwarsa sesuai SESSION_DURATION
    .sign(secret());                            // Tanda tangani token dengan kunci rahasia
}

// ----------------------------------------------------------------------------
// Fungsi: verifyToken(token)
// Mengecek apakah token JWT valid (tidak palsu dan belum kedaluwarsa).
// ----------------------------------------------------------------------------
export async function verifyToken(token?: string | null) {
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Fungsi: isAuthenticated(request)
// Mengecek apakah user yang sedang request sudah login.
// Token bisa dikirim lewat 2 cara:
//   1. Header "Authorization: Bearer ***" (dari aplikasi/script lain)
//   2. Cookie browser (dari login di halaman web)
// ----------------------------------------------------------------------------
export async function isAuthenticated(request?: Request) {
  const bearer = request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) return verifyToken(bearer);

  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(COOKIE_NAME)?.value);
}
