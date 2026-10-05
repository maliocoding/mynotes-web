/**
 * Pasang (reset) password awal & PIN verifikasi ke tabel "settings".
 *
 * PENTING SOAL KEAMANAN:
 * Script ini TIDAK menyimpan nilai asli di dalam kode. Nilainya dibaca dari:
 *   1. Argumen CLI  : node scripts/pasang-password-pin.mjs <password> <pin>
 *   2. Environment  : NOTES_DEFAULT_PASSWORD / NOTES_DEFAULT_PIN (termasuk dari .env)
 * Kalau keduanya kosong, script berhenti dengan pesan yang jelas.
 * Alasannya: repo ini publik, jadi kredensial tidak boleh ditulis di berkas
 * yang ter-commit.
 *
 * Nilai disimpan sebagai HASH PBKDF2-SHA256 (format sama dengan src/lib/pin.ts),
 * jadi tidak ada teks asli yang masuk ke database.
 *
 * Contoh pakai:
 *   node scripts/pasang-password-pin.mjs
 *   node scripts/pasang-password-pin.mjs "PasswordBaru" "123456"
 */
import { randomBytes, pbkdf2Sync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ITERATIONS = 100_000;
const KEYLEN = 32;

/** Fungsi hash yang sama persis dengan src/lib/pin.ts */
function hashPin(pin) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(pin, salt, ITERATIONS, KEYLEN, "sha256");
  return ["pbkdf2_sha256", String(ITERATIONS), salt.toString("base64"), hash.toString("base64")].join("$");
}

/** Baca pasangan KEY=VALUE dari .env tanpa memerlukan library tambahan. */
function bacaEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return {};
  const hasil = {};
  for (const baris of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const i = baris.indexOf("=");
    if (i > 0) hasil[baris.slice(0, i).trim()] = baris.slice(i + 1).trim();
  }
  return hasil;
}

const env = { ...bacaEnv(), ...process.env };

const password = process.argv[2] || env.NOTES_DEFAULT_PASSWORD || "";
const pin = process.argv[3] || env.NOTES_DEFAULT_PIN || "";

if (!password || !pin) {
  console.error(
    [
      "Nilai password/PIN tidak diberikan.",
      "",
      "Pakai salah satu cara berikut:",
      "  1. Argumen  : node scripts/pasang-password-pin.mjs <password> <pin>",
      "  2. Variabel : set NOTES_DEFAULT_PASSWORD & NOTES_DEFAULT_PIN (mis. di .env)",
      "",
      "Catatan: nilai sengaja TIDAK ditulis di dalam script karena repo ini publik.",
    ].join("\n")
  );
  process.exit(1);
}

if (!/^\d{4,6}$/.test(pin)) {
  console.error("PIN harus 4-6 digit angka.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password minimal 8 karakter.");
  process.exit(1);
}

const db = new PrismaClient();
try {
  await db.setting.upsert({
    where: { key: "password_hash" },
    create: { key: "password_hash", value: hashPin(password) },
    update: { value: hashPin(password) },
  });
  console.log("password_hash: dipasang (hash PBKDF2, bukan plaintext)");

  await db.setting.upsert({
    where: { key: "pin_hash" },
    create: { key: "pin_hash", value: hashPin(pin) },
    update: { value: hashPin(pin) },
  });
  console.log("pin_hash: dipasang (hash PBKDF2, bukan plaintext)");

  const rows = await db.setting.findMany();
  console.log("kunci tersimpan:", rows.map((r) => r.key).join(", "));
} finally {
  await db.$disconnect();
}
