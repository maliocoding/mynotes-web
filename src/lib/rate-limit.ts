// ============================================================================
// FILE: src/lib/rate-limit.ts
// FUNGSI: Membatasi jumlah percobaan login (anti brute-force).
//         Maksimal 5 kali gagal dalam 5 menit per alamat IP.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Ini mirip throttle login di Laravel (throttle:5,5).
// - Data percobaan disimpan di memori (Map), bukan database.
//   Artinya kalau server restart, hitungan percobaan ikut hilang/reset.
// ============================================================================

// Struktur data satu percobaan: jumlah gagal & kapan batas waktunya habis
type Attempt = { count: number; resetAt: number };

// Penyimpanan di memori: kunci = alamat IP, nilai = data percobaan
// Map di JS mirip array asosiatif di PHP: $attempts[$ip] = [...]
const attempts = new Map<string, Attempt>();

// Jendela waktu: 5 menit (dalam milidetik)
const WINDOW = 5 * 60 * 1000;

// ----------------------------------------------------------------------------
// Cek apakah IP ini masih boleh mencoba login.
// Mengembalikan { allowed: true/false, retryAfter: detik tersisa }
// ----------------------------------------------------------------------------
export function checkRateLimit(ip: string) {
  const now = Date.now();
  const current = attempts.get(ip);
  // Belum pernah gagal, atau masa hukumannya sudah lewat -> boleh mencoba
  if (!current || current.resetAt <= now) return { allowed: true, retryAfter: 0 };
  // Maksimal 5 kali percobaan dalam satu jendela waktu
  return { allowed: current.count < 5, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
}

// Catat satu kegagalan login untuk IP tertentu
export function recordFailure(ip: string) {
  const now = Date.now();
  const current = attempts.get(ip);
  attempts.set(
    ip,
    // Kalau belum ada catatan / sudah kedaluwarsa -> mulai hitungan baru.
    // Kalau masih dalam jendela waktu -> tambah jumlah gagalnya (+1).
    !current || current.resetAt <= now
      ? { count: 1, resetAt: now + WINDOW }
      : { ...current, count: current.count + 1 }
  );
}

// Hapus catatan kegagalan (dipanggil setelah login BERHASIL)
export function clearFailures(ip: string) {
  attempts.delete(ip);
}
