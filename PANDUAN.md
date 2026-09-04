# 📒 Panduan Lengkap Aplikasi MyNotes (Next.js)
### Untuk Programmer PHP yang Baru Belajar Next.js

Dokumen ini menjelaskan seluruh kodingan aplikasi **MyNotes** dengan bahasa sederhana, sambil membandingkannya dengan konsep PHP yang sudah kamu kenal. Setiap file kodingan di proyek ini juga sudah diberi **komentar Bahasa Indonesia** langsung di dalam kodenya.

---

## 1. Apa Itu Aplikasi MyNotes?

MyNotes adalah aplikasi **catatan pribadi** mirip Google Keep, dengan fitur:

| Fitur | Keterangan |
|---|---|
| 🔐 Login | Satu password, pakai token JWT (bukan session PHP) |
| 📝 Catatan | Buat, edit, hapus catatan berwarna |
| ☑️ Checklist | Daftar centang di dalam catatan |
| 🏷️ Label | Menandai & memfilter catatan |
| 📌 Pin & Arsip | Sematkan catatan penting, arsipkan yang lama |
| 🗑️ Sampah | Soft delete — bisa dipulihkan atau dihapus permanen |
| 🔍 Pencarian | Cari judul, isi, dan item checklist |
| ⚡ Real-time | Tampilan di semua browser ikut terbarui otomatis (SSE) |
| 🔒 Keamanan | Rate limit login, header keamanan, CORS, validasi input |

---

## 2. Perbedaan Mendasar PHP vs Next.js

| Konsep | Di PHP | Di Next.js (proyek ini) |
|---|---|---|
| Routing URL | Nama file `.php` menentukan URL | **Struktur folder** di `src/app/` menentukan URL |
| Halaman | `index.php` | `src/app/page.tsx` |
| Layout bersama | `include 'header.php'` | `src/app/layout.tsx` |
| Endpoint API | `api/login.php` + cek `$_SERVER['REQUEST_METHOD']` | `src/app/api/auth/login/route.ts` + fungsi `POST()` |
| Session login | `$_SESSION` | **JWT** di cookie (`mynotes_session`) |
| Database | `mysqli_query()` / PDO / Eloquent | **Prisma ORM** (`db.note.findMany()`, dll) |
| Validasi input | `filter_var()` / Laravel validate | **Zod** (`noteInputSchema`) |
| Output JSON | `echo json_encode($data)` | `NextResponse.json(data)` |
| Variabel rahasia | `getenv()` / file `.env` | `process.env.NAMA_VARIABEL` |
| Update tampilan | Reload halaman / jQuery AJAX | **React state** (otomatis, tanpa reload) |
| Real-time | Sulit (perlu Pusher/WebSocket) | **Server-Sent Events** bawaan |

---

## 3. Struktur Folder Proyek

```
notes/
├── middleware.ts              # Pengatur CORS, jalan sebelum semua API
├── next.config.ts             # Konfigurasi Next.js (basePath, keamanan)
├── prisma/
│   └── schema.prisma          # Definisi tabel database (SQLite)
└── src/
    ├── app/                   # HALAMAN & API (routing = struktur folder!)
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
    ├── components/            # Tampilan React (frontend)
    │   ├── notes-app.tsx      # Komponen UTAMA (otak aplikasi)
    │   ├── login.tsx          # Form login
    │   ├── note-card.tsx      # Kartu satu catatan
    │   └── note-editor.tsx    # Modal editor catatan
    ├── lib/                   # Logika pendukung (backend)
    │   ├── auth.ts            # JWT: buat & verifikasi token
    │   ├── db.ts              # Koneksi database (Prisma)
    │   ├── events.ts          # Sistem broadcast real-time
    │   ├── http.ts            # Helper respons JSON
    │   ├── notes.ts           # Format data catatan untuk API
    │   ├── rate-limit.ts      # Anti brute-force login
    │   └── schemas.ts         # Validasi input (Zod)
    └── types/
        └── note.ts            # Definisi tipe data TypeScript
```

---

## 4. Cara Kerja Routing (PENTING!)

Di PHP, kamu terbiasa: URL `/api/login.php` → file `login.php`.

Di Next.js **App Router**, URL ditentukan oleh **folder**, dan file-nya selalu bernama `route.ts` (untuk API) atau `page.tsx` (untuk halaman):

```
src/app/api/auth/login/route.ts  →  URL: /notes/api/auth/login
```

> Catatan: `/notes` di depan URL berasal dari `basePath: "/notes"` di `next.config.ts`.

Nama **fungsi** di dalam `route.ts` menentukan HTTP method:

```ts
export async function GET(request: Request)    { ... }  // kalau di-GET
export async function POST(request: Request)   { ... }  // kalau di-POST
export async function PATCH(request: Request)  { ... }  // kalau di-PATCH
export async function DELETE(request: Request) { ... }  // kalau di-DELETE
```

Ini setara dengan di PHP:
```php
if ($_SERVER['REQUEST_METHOD'] === 'GET')  { ... }
if ($_SERVER['REQUEST_METHOD'] === 'POST') { ... }
```

**Parameter dinamis**: folder bernama `[id]` berarti bagian URL itu jadi variabel:
```
src/app/api/notes/[id]/route.ts  →  /notes/api/notes/abc-123
// Di dalam kode: (await params).id  ===  "abc-123"
// Mirip PHP: $_GET['id']
```

---

## 5. Alur Login (Autentikasi JWT)

```
┌─────────┐   POST /api/auth/login {password}   ┌──────────┐
│ Browser │ ──────────────────────────────────► │  Server  │
│         │                                     │          │
│         │   ◄──────────────────────────────   │ 1. Cek rate limit (IP)
│         │   Token JWT + Cookie httpOnly       │ 2. Bandingkan password
│         │                                     │    dengan NOTES_PASSWORD (.env)
│         │                                     │ 3. Buat token JWT (30 hari)
└─────────┘                                     └──────────┘
```

Penjelasan tiap bagian:

1. **Rate limit** (`src/lib/rate-limit.ts`): maksimal 5 kali salah password dalam 5 menit per IP. Mirip `throttle` di Laravel.
2. **Perbandingan password** (`passwordMatches` di login/route.ts): memakai `timingSafeEqual` — di PHP ini sama dengan `hash_equals()`, untuk mencegah *timing attack*.
3. **Token JWT** (`src/lib/auth.ts`): setelah login benar, server membuat token terenkripsi yang berlaku 30 hari. Token dikirim ke browser lewat **cookie httpOnly** (tidak bisa dicuri JavaScript).
4. **Cek login** (`isAuthenticated`): setiap request API, server memverifikasi token dari cookie atau header `Authorization: Bearer <token>`.

Perbandingan dengan PHP:
```php
// PHP (session)
session_start();
if ($_POST['password'] === $PASSWORD) { $_SESSION['login'] = true; }

// Next.js (JWT) - konsep sama, tapi "tiket"-nya berupa token terenkripsi
// yang ditandatangani dengan JWT_SECRET, bukan data di server.
```

---

## 6. Database (Prisma + SQLite)

Database-nya **SQLite** — cukup satu file, tanpa install MySQL/PostgreSQL.

**Skema** (`prisma/schema.prisma`):

```prisma
model Note {
  id             String   @id @default(uuid())  // ID otomatis
  title          String   @default("")
  body           String   @default("")
  color          String   @default("default")
  pinned         Boolean  @default(false)
  archived       Boolean  @default(false)
  trashed        Boolean  @default(false)
  checklistItems String   @default("[]")  // array disimpan sebagai string JSON
  labels         String   @default("[]")  // array disimpan sebagai string JSON
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?                // "?" = boleh kosong (NULL)
}
```

**Koneksi** (`src/lib/db.ts`): dibuat sekali saja (pola *singleton*) supaya hemat.

**Contoh query** — bandingkan dengan SQL yang kamu kenal:

| Prisma (Next.js) | SQL (PHP/MySQL) |
|---|---|
| `db.note.findMany({ orderBy: { updatedAt: "desc" } })` | `SELECT * FROM notes ORDER BY updated_at DESC` |
| `db.note.findUnique({ where: { id } })` | `SELECT * FROM notes WHERE id = ?` |
| `db.note.create({ data: {...} })` | `INSERT INTO notes (...) VALUES (...)` |
| `db.note.update({ where: { id }, data: {...} })` | `UPDATE notes SET ... WHERE id = ?` |
| `db.note.delete({ where: { id } })` | `DELETE FROM notes WHERE id = ?` |
| `where: { updatedAt: { gt: since } }` | `WHERE updated_at > '...'` |

---

## 7. Daftar Lengkap API

Semua API diawali `/notes/api`. Semua (kecuali login) **wajib sudah login**.

| Method | URL | Fungsi | Mirip di PHP |
|---|---|---|---|
| POST | `/auth/login` | Login dengan password | `login.php` |
| POST | `/auth/logout` | Hapus cookie sesi | `logout.php` |
| GET | `/auth/session` | Cek masih login? | `cek_session.php` |
| GET | `/notes` | Ambil semua catatan (bisa `?since=`) | `SELECT * FROM notes` |
| POST | `/notes` | Buat catatan baru | `INSERT INTO notes` |
| GET | `/notes/<id>` | Ambil satu catatan | `SELECT ... WHERE id=?` |
| PATCH | `/notes/<id>` | Ubah sebagian data catatan | `UPDATE ... WHERE id=?` |
| DELETE | `/notes/<id>` | Pindah ke sampah (soft delete) | `UPDATE trashed=1` |
| DELETE | `/notes/<id>?permanent=true` | Hapus selamanya | `DELETE FROM notes` |
| POST | `/notes/<id>/restore` | Pulihkan dari sampah | `UPDATE trashed=0` |
| POST | `/sync` | Ambil perubahan sejak waktu tertentu | `SELECT ... WHERE updated_at > ?` |
| GET | `/events` | Langganan notifikasi real-time (SSE) | (mirip WebSocket) |

**Format respons sukses** (konsisten di semua endpoint, lihat `src/lib/http.ts`):
```json
{ "data": ..., "server_time": "2026-09-04T10:30:00.000Z" }
```

---

## 8. Validasi Input dengan Zod

Semua data dari client divalidasi dulu di `src/lib/schemas.ts` sebelum masuk database:

```ts
export const noteInputSchema = z.object({
  title: z.string().max(20_000).optional(),
  body: z.string().max(100_000).optional(),
  color: z.enum(["default", "red", "orange", ...]).optional(),
  pinned: z.boolean().optional(),
  checklist_items: z.array(checklistItemSchema).max(500).optional(),
  labels: z.array(z.string().max(50)).max(100).optional(),
}).strict(); // tolak field asing
```

Ini setara dengan validasi di Laravel:
```php
$request->validate([
  'title' => 'string|max:20000',
  'body'  => 'string|max:100000',
  'color' => 'in:default,red,orange,...',
]);
```

Kalau validasi gagal, API membalas **400 Bad Request** beserta detail kesalahannya.

---

## 9. Frontend React (Komponen)

React bekerja dengan **komponen** (potongan tampilan) dan **state** (data reaktif). Kalau state berubah, tampilan ikut berubah **otomatis tanpa reload halaman** — ini perbedaan terbesar dengan PHP.

### Hierarki komponen:
```
page.tsx
└── NotesApp (otak: login state, data catatan, pencarian, SSE)
    ├── Login         (kalau belum login)
    ├── NoteCard      (satu kartu per catatan, di grid)
    └── NoteEditor    (modal saat catatan diklik)
```

### Konsep penting yang sering muncul:

| Kode | Artinya | Mirip di PHP |
|---|---|---|
| `useState("")` | Variabel reaktif: `[nilai, pengubahNilai]` | `$var = ""` (tapi auto-update tampilan) |
| `useEffect(() => {...}, [])` | Jalankan sekali saat komponen tampil | Kode di awal file PHP |
| `useMemo(() => hitung(), [data])` | Hitung ulang hanya kalau `data` berubah | Cache hasil perhitungan |
| `useCallback(fn, [])` | "Ingat" fungsi agar tidak dibuat ulang | — |
| `{...objek}` (spread) | Salin objek/array | `array_merge($a, $b)` |
| `kondisi ? a : b` | If satu baris | `$kondisi ? $a : $b` |
| `a ?? b` | Kalau `a` null, pakai `b` | `$a ?? $b` (sama persis!) |
| `objek?.field` | Akses field kalau objek tidak null | `$obj?->field` (PHP 8) |
| `{data && <div>...</div>}` | Tampilkan elemen hanya kalau `data` ada | `<?php if ($data): ?>` |
| `{array.map(item => ...)}` | Loop membuat elemen HTML | `foreach ($array as $item)` |
| `fetch(url, {method: "POST"})` | Panggil API dari browser | `$.ajax()` / cURL |

### Alur data di frontend:
```
User klik "Buat catatan"
  → create() di notes-app.tsx
  → fetch POST /api/notes
  → Server simpan ke database, balas data catatan baru
  → setNotes([catatanBaru, ...catatanLama])
  → Tampilan otomatis menampilkan kartu baru (tanpa reload!)
```

---

## 10. Real-Time dengan SSE (Server-Sent Events)

Ini bagian yang paling "ajaib" dibanding PHP biasa. Alurnya:

```
Browser A ──► EventSource("/notes/api/events") ──► koneksi tetap TERBUKA
                                                        │
Browser B mengedit catatan ──► PATCH /api/notes/<id>    │
                                  │                     │
                                  ▼                     ▼
                            broadcast("note-updated") ──► Server kirim event
                                                        │   ke SEMUA browser
Browser A menerima event ──► load() ──► tampilan ikut terbarui otomatis!
```

- Server: `src/lib/events.ts` (`broadcast`) + `src/app/api/events/route.ts` (endpoint SSE)
- Browser: `new EventSource(...)` di `notes-app.tsx`
- Jadi kalau kamu buka aplikasi di HP dan laptop, edit di HP → laptop langsung ikut berubah. Tanpa perlu library tambahan seperti Pusher.

---

## 11. Fitur Keamanan yang Sudah Ada

| Perlindungan | Lokasi | Keterangan |
|---|---|---|
| Password di `.env` | `NOTES_PASSWORD` | Tidak ditulis di kode |
| Kunci JWT di `.env` | `JWT_SECRET` | Untuk tanda tangan token |
| Rate limit login | `src/lib/rate-limit.ts` | 5x gagal / 5 menit / IP |
| Anti timing attack | `login/route.ts` | `timingSafeEqual` (= `hash_equals` PHP) |
| Cookie httpOnly | `login/route.ts` | Token tidak bisa dicuri via XSS |
| Validasi input | `src/lib/schemas.ts` | Zod, menolak field asing |
| Header keamanan | `next.config.ts` | nosniff, DENY iframe, dll |
| CORS ketat | `middleware.ts` | Hanya origin yang diizinkan |

---

## 12. Cara Menjalankan Proyek

```bash
# 1. Install semua dependency (library)
npm install

# 2. Siapkan database (buat tabel dari schema.prisma)
npx prisma migrate dev

# 3. Isi file .env:
#    DATABASE_URL="file:./data/notes.db"
#    JWT_SECRET="<acak-panjang-rahasia>"
#    NOTES_PASSWORD="<password-login-kamu>"
#    ALLOWED_ORIGIN="<domain-kamu>" (opsional)

# 4. Jalankan mode development (auto-reload saat coding)
npm run dev

# 5. Buka di browser
#    http://localhost:3000/notes
```

Untuk production: `npm run build` lalu jalankan hasil build standalone (lihat `docs/DEPLOYMENT.md`).

---

## 13. Saran Urutan Belajar File

Kalau kamu mau memahami kodingan ini pelan-pelan, baca dengan urutan ini:

1. `src/types/note.ts` — bentuk datanya dulu
2. `prisma/schema.prisma` — struktur tabelnya
3. `src/lib/db.ts` → `src/lib/http.ts` → `src/lib/notes.ts` — dasar-dasar backend
4. `src/lib/auth.ts` + `src/app/api/auth/login/route.ts` — cara login bekerja
5. `src/app/api/notes/route.ts` + `src/app/api/notes/[id]/route.ts` — CRUD utama
6. `src/lib/schemas.ts` + `src/lib/rate-limit.ts` — validasi & keamanan
7. `src/components/login.tsx` — komponen React pertama
8. `src/components/note-card.tsx` → `note-editor.tsx` → `notes-app.tsx` — frontend lengkap
9. `src/lib/events.ts` + `src/app/api/events/route.ts` — bagian real-time
10. `middleware.ts` + `next.config.ts` — konfigurasi terakhir

Selamat belajar! 🚀 Setiap file sudah ada komentar Bahasa Indonesianya, jadi tinggal dibaca pelan-pelan sambil bandingkan dengan konsep PHP yang kamu sudah pahami.
