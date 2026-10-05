// ============================================================================
// FILE: src/lib/settings.ts
// FUNGSI: Menyimpan & mengambil pengaturan aplikasi dari tabel "settings".
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Ini mirip tabel konfigurasi key-value: $db->query("SELECT value FROM
//   settings WHERE key = '...'")
// - Dipakai untuk menyimpan:
//     password_hash -> hash password aplikasi (PBKDF2)
//     pin_hash      -> hash PIN verifikasi untuk ganti password
//
// KENAPA PAKAI HASH, BUKAN PLAINTEXT:
// - Kalau password/PIN disimpan apa adanya, siapa pun yang bisa membaca file
//   database (notes.db) langsung tahu passwordnya.
// - Dengan PBKDF2 (lihat src/lib/pin.ts), isi database tidak bisa dibalik
//   menjadi password asli.
// ============================================================================

import { db } from "@/lib/db";
import { hashPin, verifyPin, isValidPin } from "@/lib/pin";

// Nama kunci pada tabel settings
export const KEY_PASSWORD_HASH = "password_hash";
export const KEY_PIN_HASH = "pin_hash";

/** Baca satu nilai pengaturan. Mengembalikan null kalau belum ada. */
export async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    return row ? row.value : null;
  } catch {
    // Tabel belum ada / database belum dimigrasi -> anggap belum diatur
    return null;
  }
}

/** Simpan (buat atau timpa) satu nilai pengaturan. */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

// ---------------------------------------------------------------------------
// PASSWORD APLIKASI
// ---------------------------------------------------------------------------

/**
 * Ambil hash password yang dipakai aplikasi.
 * Kalau belum pernah diganti (tabel settings kosong), pakai NOTES_PASSWORD
 * dari .env sebagai password awal — dengan catatan password di .env itu
 * masih plaintext, jadi kita bandingkan langsung.
 */
export async function getPasswordRecord(): Promise<{ hash: string | null; plainEnv: string | null }> {
  const hash = await getSetting(KEY_PASSWORD_HASH);
  return { hash, plainEnv: hash ? null : (process.env.NOTES_PASSWORD ?? null) };
}

// ---------------------------------------------------------------------------
// PIN VERIFIKASI
// ---------------------------------------------------------------------------

/**
 * PIN awal (fallback) dibaca dari environment `NOTES_DEFAULT_PIN`.
 *
 * Sengaja TIDAK ditulis di kode karena repo ini publik. Kalau variabelnya
 * kosong DAN tabel settings belum punya `pin_hash`, fungsi inisialisasi di
 * bawah mengembalikan null, dan endpoint ganti password membalas pesan yang
 * jelas supaya admin menyetelnya lebih dulu.
 */
export const defaultPinFromEnv = (): string | null => {
  const pin = process.env.NOTES_DEFAULT_PIN;
  return pin && /^\d{4,6}$/.test(pin) ? pin : null;
};

/**
 * Ambil hash PIN verifikasi. Kalau belum ada di database, buat dari
 * `NOTES_DEFAULT_PIN` (environment) lalu simpan.
 *
 * Mengembalikan null kalau belum ada hash dan `NOTES_DEFAULT_PIN` tidak
 * disetel — artinya PIN belum pernah dikonfigurasi di server ini.
 */
export async function getOrInitPinHash(): Promise<string | null> {
  const existing = await getSetting(KEY_PIN_HASH);
  if (existing) return existing;

  const fallback = defaultPinFromEnv();
  if (!fallback) return null;

  const hash = hashPin(fallback);
  await setSetting(KEY_PIN_HASH, hash);
  return hash;
}

/**
 * Cek apakah PIN verifikasi masih memakai PIN awal dari environment.
 * Kalau belum ada hash sama sekali -> dianggap belum dikonfigurasi (true).
 */
export async function isPinDefault(): Promise<boolean> {
  const hash = await getSetting(KEY_PIN_HASH);
  if (!hash) return true; // belum dikonfigurasi
  const fallback = defaultPinFromEnv();
  return fallback ? verifyPin(fallback, hash) : false;
}

/** Verifikasi PIN yang dimasukkan user. False kalau PIN belum dikonfigurasi. */
export async function checkPin(pin: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const hash = await getOrInitPinHash();
  if (!hash) return false;
  return verifyPin(pin, hash);
}

/** Ganti PIN verifikasi dengan PIN baru (harus 4-6 digit angka). */
export async function updatePin(pin: string): Promise<void> {
  await setSetting(KEY_PIN_HASH, hashPin(pin));
}
