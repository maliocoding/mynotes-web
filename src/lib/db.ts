// ============================================================================
// FILE: src/lib/db.ts
// FUNGSI: Membuat koneksi ke database menggunakan Prisma ORM.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Prisma itu seperti Eloquent di Laravel atau PDO di PHP native.
// - File ini memastikan koneksi database hanya dibuat SATU KALI (singleton),
//   supaya tidak memboroskan koneksi saat development (hot-reload).
// ============================================================================

import { PrismaClient } from "@prisma/client";

// Trik TypeScript: kita simpan instance Prisma di variabel global
// supaya saat Next.js melakukan hot-reload (restart otomatis saat coding),
// koneksi database yang lama tidak dibuat ulang terus-menerus.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Jika sudah ada koneksi di global, pakai yang lama. Kalau belum, buat baru.
// Operator "??" artinya: "kalau kiri null/undefined, pakai yang kanan".
export const db = globalForPrisma.prisma ?? new PrismaClient();

// Di mode development, simpan koneksi ke global agar bisa dipakai ulang.
// Di production tidak perlu karena server tidak hot-reload.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
