# 📒 MyNotes — Web (Next.js)

> Aplikasi catatan pribadi ala **Google Keep** untuk single user.
> Bagian **server/web** dari proyek MyNotes, dibangun dengan **Next.js 16 (App Router) + Prisma + SQLite**.

Aplikasi mobile-nya ada di repo terpisah:
👉 **[MyNotes Mobile (Flutter)](https://github.com/maliocoding/mynotes-mobile)**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite)](https://sqlite.org)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| 🔐 Login single password | Tanpa registrasi. Satu password global, pakai **JWT** (bukan session PHP) |
| 📝 Catatan warna-warni | Buat, edit, hapus catatan dengan 12 pilihan warna ala Keep |
| ☑️ Checklist | Daftar centang di dalam catatan |
| 🏷️ Label | Menandai & memfilter catatan |
| 📌 Pin & Arsip | Sematkan catatan penting, arsipkan yang lama |
| 🗑️ Sampah | Soft delete — bisa dipulihkan atau dihapus permanen |
| 🔍 Pencarian | Cari judul, isi, dan item checklist (realtime) |
| ⚡ Real-time | Perubahan tampil di semua browser otomatis (SSE) |
| 📱 Sinkronisasi API | Menyediakan endpoint untuk aplikasi mobile (Flutter) |
| 🔒 Keamanan | Rate limit login, timing-safe compare, header keamanan, CORS, validasi Zod |

---

## 🛠️ Teknologi

- **Next.js 16** (App Router, `output: standalone`)
- **TypeScript** + **Tailwind CSS 4**
- **Prisma ORM** + **SQLite** (tanpa server database)
- **JWT** (`jose`) untuk autentikasi
- **SSE** untuk pembaruan real-time
- **Zod** untuk validasi input

---

## 📖 Daftar Isi

- [Prasyarat](#-prasyarat)
- [Instalasi Lokal](#-instalasi-lokal)
- [Menjalankan di Development](#-menjalankan-di-development)
- [Build Production](#-build-production)
- [Menjalankan di Production (PM2)](#-menjalankan-di-production-pm2)
- [Konfigurasi Environment](#-konfigurasi-environment)
- [Endpoint API](#-endpoint-api)
- [Deploy di Windows + Cloudflare Tunnel](#-deploy-di-windows--cloudflare-tunnel)
- [Backup Database](#-backup-database)
- [Struktur Proyek](#-struktur-proyek)
- [Repo Mobile (Flutter)](#-repo-mobile-flutter)
- [Lisensi](#-lisensi)

---

## 📋 Prasyarat

- **Node.js 20+** (disarankan LTS)
- **npm** 10+
- Git

> 💡 Aplikasi ini memakai SQLite, jadi **tidak perlu install server database** seperti MySQL/PostgreSQL.

---

## 🚀 Instalasi Lokal

### 1. Clone repo

```bash
git clone https://github.com/maliocoding/mynotes-web.git
cd mynotes-web
```

### 2. Install dependency

```bash
npm install
```

### 3. Siapkan file `.env`

Salin contoh environment, lalu isi nilai rahasianya:

```bash
copy .env.example .env
```

Isi minimal:

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Lokasi file SQLite, contoh `file:./data/notes.db` |
| `NOTES_PASSWORD` | Password login aplikasi (bebas, makin panjang makin kuat) |
| `JWT_SECRET` | Kunci rahasia untuk tanda tangan token JWT |
| `ALLOWED_ORIGIN` | Origin yang diizinkan akses API (untuk CORS) |

### 4. Buat database & migrasi

```bash
npm run db:generate
npm run db:migrate
```

### 5. Jalankan

```bash
npm run dev
```

Buka **http://localhost:3000/notes** di browser.

> Aplikasi dikonfigurasi dengan `basePath: /notes`, jadi semua halaman & API berada di bawah path `/notes`.

---

## 🏭 Build Production

```bash
npm run build
```

Perintah ini menjalankan `next build` lalu `scripts/prepare-standalone.mjs` untuk
menyalin aset static & folder `public` ke output standalone di `.next/standalone`.

---

## ▶️ Menjalankan di Production (PM2)

Project sudah menyertakan konfigurasi **PM2** di `ecosystem.config.cjs`.

```bash
npm run build
npm run start        # alias pm2 restart notes --update-env
npm run pm2:status   # cek status proses
npm run pm2:logs     # lihat log
npm run pm2:stop     # hentikan proses
```

Script `start-with-env.js` bertugas memuat `.env` terlebih dahulu, lalu menjalankan
server standalone `server.js` — berguna karena output standalone Next.js tidak
membaca `.env` otomatis.

---

## ⚙️ Konfigurasi Environment

Salin `.env.example` menjadi `.env`:

| Variabel | Contoh | Keterangan |
|---|---|---|
| `DATABASE_URL` | `file:./data/notes.db` | Path file database SQLite |
| `NOTES_PASSWORD` | `ganti-dengan-password-pribadi-yang-kuat` | Password login web & mobile |
| `JWT_SECRET` | `ganti-dengan-min-32-karakter-acak` | Kunci JWT, minimal 32 karakter acak |
| `ALLOWED_ORIGIN` | `https://amal.rsudwelasasih.my.id` | Origin yang diizinkan CORS |

### 🔑 Membuat `JWT_SECRET` yang aman

```bash
npx tsx scripts/gen-password.ts
```

Salin hasilnya ke `.env` sebagai nilai `JWT_SECRET`.

> ⚠️ **Jangan commit `.env`** ke repository. File `.env` sudah di-ignore lewat `.gitignore`.

---

## 🔌 Endpoint API

Semua endpoint berada di bawah `/notes/api`. Autentikasi memakai cookie `mynotes_session`
(web) atau header `Authorization: Bearer <token>` (mobile).

| Method | Endpoint | Keterangan |
|---|---|---|
| `POST` | `/auth/login` | Login dengan password |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/auth/session` | Cek status login |
| `GET` | `/events` | Aliran **SSE** untuk real-time update |
| `GET` | `/notes` | Ambil semua catatan |
| `POST` | `/notes` | Buat catatan baru |
| `GET` | `/notes/[id]` | Ambil satu catatan |
| `PATCH` | `/notes/[id]` | Ubah catatan (partial update) |
| `DELETE` | `/notes/[id]` | Hapus catatan (masuk sampah) |
| `POST` | `/notes/[id]/restore` | Pulihkan catatan dari sampah |
| `POST` | `/sync` | Sinkronisasi inkremental untuk mobile (offline-first) |

---

## ☁️ Deploy di Windows + Cloudflare Tunnel

Panduan lengkap deployment self-hosted ada di **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

Ringkasannya:

1. Build aplikasi: `npm run build`
2. Jalankan via PM2 (port default `3007`)
3. Arahkan Cloudflare Tunnel path `/notes*` ke `http://127.0.0.1:3007`
4. Ingat: Next.js sudah memakai `basePath: /notes`, jadi atur ingress `/notes*`
   **sebelum** aturan catch-all di Cloudflare.

---

## 💾 Backup Database

Database SQLite terletak di `prisma/data/notes.db` (sesuai `DATABASE_URL`).

Backup harian sudah tersedia lewat script **`scripts/backup.ps1`**:

```powershell
powershell -ExecutionPolicy Bypass -File C:\nextjs\notes\scripts\backup.ps1
```

Script ini menyalin database ke folder `backups/` dengan nama ber-timestamp dan
menyimpan maksimal 30 file backup terakhir. Jadwalkan dengan **Windows Scheduled Task**
agar berjalan otomatis setiap hari.

---

## 🗂️ Struktur Proyek

```
mynotes-web/
├── middleware.ts              # CORS & proteksi API (jalan sebelum route)
├── next.config.ts             # Konfigurasi Next.js (basePath, standalone, security headers)
├── ecosystem.config.cjs       # Konfigurasi PM2
├── start-with-env.js          # Load .env lalu start server standalone
├── prisma/
│   ├── schema.prisma          # Definisi tabel database (SQLite)
│   └── migrations/            # Riwayat migrasi database
├── scripts/
│   ├── backup.ps1             # Backup database SQLite
│   ├── gen-password.ts        # Generator JWT_SECRET acak
│   └── prepare-standalone.mjs # Salin static & public ke output standalone
├── public/                    # Aset statis
└── src/
    ├── app/                   # Halaman & API (routing = struktur folder)
    │   ├── layout.tsx         # Kerangka HTML semua halaman
    │   ├── page.tsx           # Halaman utama (/)
    │   └── api/               # Semua endpoint API
    │       ├── auth/login/route.ts     # POST - login
    │       ├── auth/logout/route.ts    # POST - logout
    │       ├── auth/session/route.ts   # GET  - cek status login
    │       ├── events/route.ts         # GET  - SSE real-time
    │       ├── notes/route.ts          # GET semua / POST buat catatan
    │       ├── notes/[id]/route.ts     # GET/PATCH/DELETE satu catatan
    │       ├── notes/[id]/restore/route.ts # POST pulihkan dari sampah
    │       └── sync/route.ts           # POST sinkronisasi incremental
    ├── components/            # Komponen React (frontend)
    │   ├── notes-app.tsx      # Komponen utama aplikasi
    │   ├── login.tsx          # Form login
    │   ├── note-card.tsx      # Kartu catatan
    │   └── note-editor.tsx    # Modal editor catatan
    ├── lib/                   # Logika pendukung (backend)
    │   ├── auth.ts            # JWT: buat & verifikasi token
    │   ├── db.ts              # Koneksi database (Prisma)
    │   ├── events.ts          # Sistem broadcast real-time (SSE)
    │   ├── http.ts            # Helper respons JSON
    │   ├── notes.ts           # Format data catatan untuk API
    │   ├── rate-limit.ts      # Anti brute-force login
    │   └── schemas.ts         # Validasi input (Zod)
    └── types/
        └── note.ts            # Definisi tipe data TypeScript
```

---

## 📱 Repo Mobile (Flutter)

Aplikasi mobile MyNotes berada di repository terpisah:

👉 **[github.com/maliocoding/mynotes-mobile](https://github.com/maliocoding/mynotes-mobile)**

Mobile app dibangun dengan **Flutter**, mendukung **offline-first**, sinkronisasi
dua arah dengan server ini, serta unlock biometrik (sidik jari). Silakan buka
repo tersebut untuk petunjuk instalasi dan build APK.

---

## 📄 Dokumentasi Tambahan

- **[PANDUAN.md](PANDUAN.md)** — Panduan kode lengkap (cocok untuk programmer PHP yang baru belajar Next.js)
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Panduan deployment Windows + Cloudflare Tunnel

---

## 🤝 Kontribusi

Kontribusi, issue, dan pull request sangat diterima! Silakan buka issue terlebih
dahulu untuk mendiskusikan perubahan besar.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Lihat [LICENSE](./LICENSE) untuk detail.

---

Dibuat dengan ❤️ oleh [maliocoding](https://github.com/maliocoding)
