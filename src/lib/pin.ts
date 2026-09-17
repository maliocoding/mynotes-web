// ============================================================================
// FILE: src/lib/pin.ts
// FUNGSI: Membuat & memverifikasi hash PIN untuk fitur kunci catatan.
//         PIN di-hash dengan PBKDF2-SHA256 (salted, 100.000 iterasi) sehingga
//         PIN asli TIDAK pernah disimpan di database.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Mirip password_hash() / password_verify() di PHP (bcrypt), tapi di sini
//   kita pakai PBKDF2 karena harus bisa diverifikasi juga di sisi mobile
//   (Flutter/Dart) dengan hasil yang identik.
// ============================================================================

import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";

const ITERATIONS = 100_000;
const KEYLEN = 32;

// Format hash: pbkdf2_sha256$<iterasi>$<salt base64>$<hash base64>
const SEP = "$";

/** Cek apakah PIN valid secara format: numerik 4-6 digit. */
export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

/** Buat hash PIN dari PIN asli. */
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(pin, salt, ITERATIONS, KEYLEN, "sha256");
  return ["pbkdf2_sha256", String(ITERATIONS), salt.toString("base64"), hash.toString("base64")].join(SEP);
}

/** Verifikasi PIN terhadap hash tersimpan (aman terhadap timing attack). */
export function verifyPin(pin: string, stored: string): boolean {
  try {
    const [algo, iterStr, saltB64, hashB64] = stored.split(SEP);
    if (algo !== "pbkdf2_sha256") return false;
    const iterations = parseInt(iterStr, 10);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = pbkdf2Sync(pin, salt, iterations, expected.length, "sha256");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
