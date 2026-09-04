# PRD — Personal Notes App (Google Keep Clone)

| | |
|---|---|
| **Nama produk** | MyNotes (sementara) |
| **Platform** | Web (Next.js) + Mobile (Flutter) |
| **URL publik** | `https://amal.rsudwelasasih.my.id/notes` |
| **Model user** | Single user (tanpa registrasi, hanya password) |
| **Deployment** | Self-hosted di Windows lokal, diekspos via Cloudflare Tunnel |
| **Versi dokumen** | 1.0 |
| **Status** | Draft — siap dieksekusi |

---

## 1. Ringkasan & Latar Belakang

Kebutuhan: aplikasi catatan pribadi mirip Google Keep yang:

- Berjalan di server lokal Windows (bukan cloud pihak ketiga).
- Bisa dibuka dari web di `amal.rsudwelasasih.my.id/notes`.
- Punya aplikasi mobile (Flutter) yang tersambung ke server yang sama.
- **Sinkron otomatis dua arah**: ubah di mobile → web langsung ikut berubah, dan sebaliknya.
- Tanpa sistem akun/registrasi — cukup satu password karena hanya satu user.

---

## 2. Tujuan & Kriteria Sukses

| Tujuan | Ukuran Sukses |
|---|---|
| Catatan bisa dibuat/diubah/dihapus dari web & mobile | CRUD berfungsi di kedua platform |
| Perubahan tampil di platform lain tanpa refresh manual | Web update < 3 detik setelah mobile save (realtime/SSE), mobile sync saat dibuka/resume |
| Akses aman walau tanpa akun | Login password + rate limit, data tidak bisa dibaca tanpa login |
| Data aman & tidak hilang | Backup SQLite otomatis harian, tidak ada data hilang saat server restart |

---

## 3. Ruang Lingkup

### 3.1 MVP (Fase 1) — WAJIB

- [x] Autentikasi single password
- [x] Buat, baca, edit, hapus catatan
- [x] Judul + isi teks
- [x] Checklist (to-do list yang bisa dicentang)
- [x] Warna catatan (seperti Keep)
- [x] Pin / unpin
- [x] Arsip & tempat sampah (trash) + restore
- [x] Label / tag + filter per label
- [x] Pencarian teks (judul + isi)
- [x] Tampilan grid masonry (web) & grid 2 kolom (mobile)
- [x] Sinkronisasi otomatis dua arah

### 3.2 Fase 2 — MENYUSUL (menuju "sama persis" Keep)

- Reminder (butuh scheduler + notifikasi push — kompleks, dipisah)
- Lampiran gambar
- Drawing / coretan
- Dark mode
- Share / export note
- Kolaborasi (tidak diperlukan — single user, abaikan)

> Catatan: "sama persis Google Keep" dicapai bertahap. Fase 1 menutup 90% pemakaian harian. Reminder & gambar adalah fitur paling rumit, makanya dipisah supaya MVP cepat jalan.

### 3.3 Out of Scope (selamanya)

- Multi-user / akun / registrasi
- Sharing ke orang lain

---

## 4. User Stories

1. Sebagai pemilik, saya bisa membuka `…/notes` lalu memasukkan password untuk masuk.
2. Saya bisa membuat catatan baru dengan judul & isi, dan memilih warna.
3. Saya bisa membuat checklist dan mencentang item yang selesai.
4. Saya bisa pin catatan penting agar selalu di atas.
5. Saya bisa arsipkan catatan agar tidak tampil di halaman utama.
6. Saya bisa hapus catatan (masuk sampah), lalu restore atau hapus permanen.
7. Saya bisa memberi label dan memfilter catatan berdasarkan label.
8. Saya bisa mencari catatan berdasarkan kata kunci.
9. Saat saya edit di HP, buka web — perubahan sudah ada di sana (dan sebaliknya) tanpa aksi manual.
10. Saya bisa pakai aplikasi HP walau sedang offline (baca cache lokal), dan perubahan ter-sync saat online kembali.

---

## 5. Kebutuhan Fungsional (FR)

| ID | Kebutuhan | Detail |
|---|---|---|
| FR-1 | Login password | Satu password global. Web: cookie session. Mobile: token tersimpan aman (flutter_secure_storage). Gagal 5x → blokir 5 menit. |
| FR-2 | Buat catatan | Bisa kosong (hanya judul atau hanya isi), otomatis tersimpan. |
| FR-3 | Edit catatan | Edit judul, isi, warna, pin, arsip, label, checklist — save per field (partial update). |
| FR-4 | Checklist | Item bisa ditambah, dicentang, dihapus, diurutkan. |
| FR-5 | Pin | Catatan ter-pin tampil di bagian atas, terpisah dari catatan biasa. |
| FR-6 | Arsip | Catatan diarsipkan tidak muncul di halaman utama, ada menu Arsip. |
| FR-7 | Sampah | Hapus = masuk sampah (soft delete). Restore kapan saja. Hapus permanen setelah konfirmasi. |
| FR-8 | Label | Buat/tempel/hapus label. Filter: klik label menampilkan catatan dengan label tsb. |
| FR-9 | Pencarian | Search judul + isi, case-insensitive, hasil realtime saat mengetik. |
| FR-10 | Warna | 12 pilihan warna ala Keep. |
| FR-11 | Sinkronisasi | Lihat bagian 10. |
| FR-12 | Logout | Hapus session/token. |
| FR-13 | Ganti password | Via file konfigurasi/env (bukan UI) untuk keamanan — bisa ditambah UI admin nanti. |

---

## 6. Kebutuhan Non-Fungsional (NFR)

| Area | Requirement |
|---|---|
| Keamanan | Password di-hash (bcrypt/argon2), tidak pernah plaintext. HTTPS via Cloudflare. Cookie `httpOnly` + `Secure`. Rate limit login. Header keamanan dasar (CSP minimal, CORS ketat). |
| Performa | Load halaman utama < 2 detik. Save note terasa instan (< 300 ms server response). API ringan untuk mobile (payload JSON kecil). |
| Reliabilitas | Server jalan sebagai Windows Service (auto-start saat PC nyala). Data SQLite tidak rusak saat restart. Backup otomatis harian. |
| Kompatibilitas | Web: Chrome/Edge terbaru (desktop & mobile browser). Mobile: Android 8+ (APK). iOS menyusul kalau perlu. |
| Maintainability | Single repo (monorepo: `/web` Next.js + `/mobile` Flutter). Dokumentasi `.env` & cara run jelas. |

---

## 7. Arsitektur Sistem

```
[ HP Android — Flutter App ]
        │  HTTPS (JSON API + SSE)
        ▼
[ Cloudflare Tunnel ]  amal.rsudwelasasih.my.id/notes
        │
        ▼
[ Windows Lokal — Next.js Server  (port 3007) ]
        │
        ├── Web UI  (App Router, basePath /notes)
        ├── REST API (/api/notes, /api/auth)
        ├── Realtime push (SSE /api/events atau WebSocket)
        └── SQLite (file: data/notes.db)
```

### Tech stack utama

| Layer | Teknologi | Alasan |
|---|---|---|
| Web framework | **Next.js 14+ (App Router) + TypeScript** | Satu proses untuk UI + API, gampang deploy di Windows |
| Database | **SQLite** (file lokal) | Single user, tanpa server DB, backup tinggal copy file. Migrasi gampang ke Postgres kalau suatu saat butuh |
| ORM | **Prisma** (atau Drizzle) | Migrasi & query rapi, jalan baik di Windows |
| Auth | `bcryptjs`/`argon2` + **JWT (jose)** | Password hash di env; web pakai cookie httpOnly, mobile pakai bearer token |
| Realtime | **SSE (`/api/events`)** sebagai default; WebSocket (`ws`) opsional | SSE lebih sederhana & stabil di balik tunnel; cukup untuk push "ada perubahan" |
| Mobile | **Flutter** (Dart) | Satu codebase Android (iOS nanti) |
| Mobile state | **Riverpod** | State management + sync service |
| Mobile storage | **drift / sqflite** (cache lokal) + `flutter_secure_storage` (token) | Offline read & sync queue |
| Process manager | **PM2** atau **NSSM** (Windows Service) | Auto-start & auto-restart server |

**Kenapa SQLite bukan MySQL/Postgres:** satu user, beban kecil, tidak perlu install DB server di Windows. File DB bisa di-backup dengan copy 1 file.

---

## 8. Desain Data

### Tabel `notes`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (UUID) | PK |
| title | TEXT | default '' |
| body | TEXT | default '' |
| color | TEXT | default 'default' |
| pinned | INTEGER | 0/1 |
| archived | INTEGER | 0/1 |
| trashed | INTEGER | 0/1 |
| checklist_items | TEXT (JSON) | `[{id, text, checked, order}]` |
| labels | TEXT (JSON) | `["kerja","ide"]` — fase 1 cukup JSON; fase 2 bisa dinormalisasi ke tabel `labels` + `note_labels` |
| created_at | TEXT (ISO) | |
| updated_at | TEXT (ISO) | dipakai untuk sinkronisasi & last-write-wins |
| deleted_at | TEXT (ISO/null) | null = aktif; terisi = di sampah. Hapus permanen = row dihapus beneran |

### Tabel `settings`

- `key`, `value` — simpan metadata sync, versi skema, dll.

> **Catatan desain:** untuk single user, label & checklist disimpan sebagai JSON di dalam note (sederhana & cepat). Kalau nanti butuh query label kompleks, baru dinormalisasi.

---

## 9. API Endpoints

Semua endpoint di bawah prefix `/notes` (karena basePath), kecuali dinyatakan lain.

### Auth

| Method | Path | Body | Hasil |
|---|---|---|---|
| POST | `/api/auth/login` | `{password}` | Sukses: set cookie (web) + `{token}` (mobile). Gagal: 401 |
| POST | `/api/auth/logout` | - | Hapus session/token |
| GET | `/api/auth/session` | - | `{authenticated: true}` / 401 |

### Notes

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/notes?since=<ISO>&archived=&trashed=&label=&q=` | Ambil catatan. `since` untuk sync incremental |
| POST | `/api/notes` | Buat catatan `{title, body, color, pinned, archived, checklist_items, labels}` |
| GET | `/api/notes/:id` | Detail satu catatan |
| PATCH | `/api/notes/:id` | Partial update (judul/isi/warna/pin/arsip/checklist/label). Server update `updated_at` |
| DELETE | `/api/notes/:id` | Soft delete → masuk sampah |
| DELETE | `/api/notes/:id?permanent=true` | Hapus permanen (kosongkan sampah / item) |
| POST | `/api/notes/:id/restore` | Restore dari sampah |

### Sync & Realtime

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/sync` | Batch push-pull untuk mobile (opsional, bikin efisien: kirim perubahan lokal + terima perubahan server dalam 1 request) |
| GET | `/api/events` | SSE: server push event `note-updated` / `note-deleted` ke client yang connect |

**Response standar:** `{ "data": ..., "server_time": "..." }` — `server_time` penting untuk koreksi jam client saat sync.

---

## 10. Mekanisme Sinkronisasi (inti sistem)

**Model: server sebagai sumber kebenaran + last-write-wins.**

1. Setiap note punya `updated_at`. Setiap perubahan (termasuk delete) memperbarui `updated_at`.
2. Hapus memakai **soft delete** (`deleted_at`), jadi penghapusan juga ikut tersinkron sebagai "tombstone" — HP yang offline tahu note itu dihapus.
3. **Alur sync mobile:**
   - Simpan `last_sync_at` di lokal.
   - Saat app dibuka / resume / pull-to-refresh / online lagi: panggil `GET /api/notes?since=last_sync_at`.
   - Terima semua note yang berubah (termasuk yang di-trash), update cache lokal, lalu set `last_sync_at = server_time`.
   - Perubahan lokal (saat offline) di-queue, dikirim saat online via `PATCH`/`POST`.
4. **Realtime web:** web subscribe SSE `/api/events`. Setiap kali ada perubahan di server (dari mobile atau web lain), server broadcast event → web langsung refetch/update state tanpa refresh.
5. **Conflict resolution:** kalau catatan yang sama diubah di 2 tempat dengan data beda, **yang terakhir sampai ke server menang** (last-write-wins berdasarkan `updated_at`). Untuk 1 user ini sudah cukup.

---

## 11. Desain UI/UX

### Web (Next.js) — mengikuti pola Google Keep

- **Top bar:** logo/title, search bar, tombol refresh, avatar (logout).
- **Sidebar:** Notes, Reminders (fase 2), Labels, Edit labels, Archive, Trash.
- **Konten utama:** masonry grid (CSS columns), kartu warna-warni. Catatan pin di baris terpisah paling atas.
- **Kartu note:** hover muncul aksi: pin, ubah warna, archive, delete.
- **Editor:** klik kartu → membesar jadi modal/expanded card di tempat (bukan halaman baru). Bisa tambah checklist & label.
- **Trash:** tampil pesan "catatan di sampah akan dihapus permanen setelah 7 hari" (opsional auto-purge).

### Mobile (Flutter)

- **Home:** AppBar dengan search + grid 2 kolom. FAB (+) buat note.
- **Editor:** full screen — field judul, field isi, tombol checklist, warna, label, pin, archive.
- **Navigasi:** drawer: Notes, Archive, Trash, Labels.
- **Gesture:** swipe note untuk archive/delete (opsional, fase 1 cukup tombol).
- **Offline indicator:** banner "Offline — perubahan akan disinkronkan" saat tidak konek.

---

## 12. Keamanan

1. **Password:** disimpan sebagai hash di `.env` (`NOTES_PASSWORD_HASH`), dibuat sekali via script `npm run gen-password`. Tidak ada password di kode.
2. **Login:** rate limit 5 percobaan / 5 menit per IP. Bisa tambah Cloudflare Access (Zero Trust) di depannya nanti.
3. **Session web:** cookie `httpOnly`, `Secure`, `SameSite=Lax`. Mobile: JWT bearer token (masa berlaku panjang, bisa dicabut dengan ganti password).
4. **Transport:** semua lewat HTTPS (Cloudflare).
5. **CORS:** hanya izinkan origin `https://amal.rsudwelasasih.my.id` (web) — mobile app tidak butuh CORS.
6. **Validasi input:** semua input di-escape, payload dibatasi ukurannya (mis. note max 100 KB).
7. **Header:** tambah security header dasar di `next.config` (X-Content-Type-Options, frame deny, dll).

---

## 13. Deployment (Lokal + Cloudflare Tunnel)

### 13.1 Server Next.js di Windows

1. Install Node.js 20 LTS.
2. `next build` → `next start -p 3007`.
3. `next.config.js` set `basePath: '/notes'` (karena diakses lewat path `/notes`).
4. Jadikan service pakai **PM2** (`pm2 start`) + `pm2-windows-startup`, atau **NSSM**. Tujuannya: nyala otomatis saat PC restart.
5. Data: `data/notes.db` di folder project. Backup: task scheduler copy file DB tiap hari ke folder aman (dan/atau sync ke tempat lain).

### 13.2 Cloudflare Tunnel

Tambah ingress rule di config tunnel (yang sudah dipakai `/hermes`, `/9router`). Taruh rule `/notes` **sebelum** rule catch-all:

```yaml
ingress:
  - hostname: amal.rsudwelasasih.my.id
    path: /notes
    service: http://localhost:3007
  # ...rule /hermes, /9router yang sudah ada...
  - service: http_status:404
```

> ⚠️ Catatan teknis: dengan path `/notes`, prefix path **tidak** di-strip otomatis — makanya Next.js harus set `basePath: '/notes'` supaya semua asset & API jalan. Alternatif lebih bersih (tanpa pusing basePath): pakai subdomain `notes.amal.rsudwelasasih.my.id`. Tapi karena diminta `/notes`, kita pakai basePath.

### 13.3 Mobile

- Build APK Flutter → install di HP Android.
- Konfigurasi: base URL API di `lib/config.dart` → `https://amal.rsudwelasasih.my.id/notes`.
- Bisa juga bikin 2 environment (local `http://192.168.x.x:3007/notes` untuk testing di WiFi, dan production).

---

## 14. Milestone / Roadmap

| Fase | Deliverable | Estimasi |
|---|---|---|
| M0 | Setup repo (monorepo web+mobile), Next.js init, Prisma+SQLite, `.env`, basePath | 0.5 hari |
| M1 | API: auth + CRUD notes + sync (`since`) + tombstones | 1–2 hari |
| M2 | Web UI lengkap (grid, editor, pin, arsip, sampah, label, search) | 2–3 hari |
| M3 | Auth hardening (rate limit, cookie, header) + SSE realtime | 1 hari |
| M4 | Flutter app (UI + cache lokal + sync service) | 3–5 hari |
| M5 | Integrasi sync dua arah, test skenario offline | 1–2 hari |
| M6 | Deploy tunnel `/notes`, service Windows, backup otomatis, UAT | 1 hari |

**Total estimasi: ± 2–3 minggu part-time.**

---

## 15. Kriteria Penerimaan (Acceptance Criteria)

1. Buka `https://amal.rsudwelasasih.my.id/notes` tanpa login → diminta password. Salah → error, 5x → blokir.
2. Setelah login, bisa buat/edit/hapus note; refresh halaman → data tetap.
3. Bikin note di HP → buka web (tanpa refresh) → note muncul/update < 3 detik.
4. Edit di web → buka app HP (resume) → perubahan tampil.
5. Centang checklist di HP → di web ikut tercentang.
6. Hapus note di web → di HP note hilang dari daftar aktif & ada di sampah.
7. Restore dari sampah di HP → muncul lagi di web.
8. Search "rapat" → hanya note yang mengandung "rapat" (judul/isi) yang tampil.
9. Filter label "kerja" → hanya note berlabel kerja.
10. Matikan WiFi di HP → buka app → catatan lama masih bisa dibaca (cache). Edit offline → nyalakan WiFi → perubahan tersinkron ke web.
11. Restart PC → server & tunnel jalan otomatis, data utuh.
12. File `notes.db` ter-backup otomatis tiap hari.

---

## 16. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| WebSocket/SSE bermasalah di balik Cloudflare Tunnel | Realtime gagal | Default pakai **SSE** (lebih stabil); fallback polling 10 detik |
| basePath `/notes` bikin asset/API salah path | Web rusak | Set `basePath` + test di M0 sejak awal; alternatif subdomain |
| Konflik sync (edit di 2 tempat offline) | Data salah | Last-write-wins + tampilkan `updated_at`; untuk 1 user risiko kecil |
| Data hilang (DB corrupt) | Catatan hilang | Backup harian otomatis + simpan beberapa versi backup |
| Brute force password | Akses ilegal | Rate limit + password kuat + opsional Cloudflare Access |
| Build Flutter di Windows gagal | Mobile telat | Setup Android SDK benar; bisa pakai `flutter build apk --release` setelah doctor OK |
| Native module (bcrypt/better-sqlite3) error di Windows | Gagal install | Pakai `bcryptjs` (pure JS) & Prisma (prebuilt engine) untuk hindari kompilasi native |

---

## 17. Keputusan Desain yang Sudah Diambil (default, bisa diubah)

| Hal | Keputusan |
|---|---|
| Database | SQLite (paling cocok untuk single user self-host) |
| Auth | Single password → JWT (cookie web, bearer mobile) |
| Realtime | SSE default, WebSocket/polling sebagai fallback |
| Checklist & label | JSON di dalam note (fase 1), normalisasi tabel (fase 2) |
| Hapus note | Soft delete + tombstones agar sync konsisten |
| Reminder, gambar, drawing | Fase 2 |
| Path akses | `/notes` (pakai basePath), alternatif subdomain didokumentasikan |
