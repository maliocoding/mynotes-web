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
// Fungsi: createToken()
// Dipanggil saat user berhasil login. Membuat token JWT baru.
// Token berlaku selama 30 hari ("30d").
// Di PHP mirip: JWT::encode(['role' => 'owner', 'exp' => time() + 30*24*3600], $secret)
// ----------------------------------------------------------------------------
export async function createToken() {
  return new SignJWT({ role: "owner" })        // Data (payload) yang disimpan dalam token
    .setProtectedHeader({ alg: "HS256" })       // Algoritma enkripsi HS256 (HMAC + SHA256)
    .setIssuedAt()                              // Catat waktu token dibuat
    .setExpirationTime("30d")                   // Token kedaluwarsa dalam 30 hari
    .sign(secret());                            // Tanda tangani token dengan kunci rahasia
}

// ----------------------------------------------------------------------------
// Fungsi: verifyToken(token)
// Mengecek apakah token JWT valid (tidak palsu dan belum kedaluwarsa).
// Mengembalikan true jika valid, false jika tidak.
// Di PHP mirip: try { JWT::decode($token, $secret); return true; } catch { return false; }
// ----------------------------------------------------------------------------
export async function verifyToken(token?: string | null) {
  // Jika token kosong atau JWT_SECRET belum diset, langsung dianggap tidak valid
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    await jwtVerify(token, secret()); // Verifikasi tanda tangan & masa berlaku token
    return true;
  } catch {
    return false; // Token rusak / palsu / kedaluwarsa
  }
}

// ----------------------------------------------------------------------------
// Fungsi: isAuthenticated(request)
// Mengecek apakah user yang sedang request sudah login.
// Token bisa dikirim lewat 2 cara:
//   1. Header "Authorization: Bearer <token>" (biasanya dari aplikasi/script lain)
//   2. Cookie browser (dari login di halaman web)
// Di PHP mirip: if (isset($_SESSION['user_id'])) { ... }
// ----------------------------------------------------------------------------
export async function isAuthenticated(request?: Request) {
  // Cara 1: Ambil token dari header Authorization (format: "Bearer <token>")
  const bearer = request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) return verifyToken(bearer);

  // Cara 2: Ambil token dari cookie browser
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(COOKIE_NAME)?.value);
}
