<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Peta Cepat MyNotes Web

> Dokumen ini untuk **AI/agent & developer** yang baru masuk ke repo.
> Tujuan: paham arsitektur & konvensi tanpa harus membaca ulang semua file.
> Untuk dokumentasi pengguna, lihat [README.md](README.md). Untuk penjelasan
> kode bergaya "untuk programmer PHP", lihat [PANDUAN.md](PANDUAN.md).

---

## 1. Fakta Singkat (jalur & perintah)

| Item | Nilai |
|---|---|
| Path proyek | `C:\nextjs\notes` |
| URL dev/lokal | http://localhost:3007/notes |
| `basePath` | **`/notes`** — semua halaman & API diawali `/notes` (lihat `next.config.ts`) |
| Output build | `output: "standalone"` → `.next/standalone/server.js` |
| Proses server | **PM2**, nama proses `notes` (lihat `ecosystem.config.cjs`) |
| Node / npm | Node 24.x (min. 20), npm 10.x |
| Prisma | 6.x, SQLite |
| Database | `prisma/data/notes.db` (`DATABASE_URL=file:./data/notes.db`) |
| Repo | `github.com/maliocoding/mynotes-web` — **PUBLIK**, branch `main` |
| Mobile | repo terpisah: `github.com/maliocoding/mynotes-mobile` (Flutter) |

### Perintah harian

```bash
# development
npm run dev                      # next dev

# production (WAJIB urutan ini — lihat catatan build di §5)
pm2 stop notes                   # 1. lepas file lock .next/standalone
rm -rf .next/standalone          # 2. (Windows) kadang perlu dibersihkan
npm run build                    # 3. next build + salin aset ke standalone
pm2 start notes                  # 4. jalankan
pm2 logs notes                   #    lihat log
```

`npm run start` hanya alias `pm2 restart notes --update-env` — **tidak** melakukan
build. Untuk perubahan kode, build tetap harus dijalankan.

### Gerbang kualitas sebelum bilang "selesai"

```bash
npx tsc --noEmit -p tsconfig.json    # harus bersih (exit 0)
npm run lint                          # eslint
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3007/notes   # harus 200
```

---

## 2. Arsitektur: di mana mencari apa

Prinsip routing Next.js App Router: **struktur folder = URL**.
`src/app/api/auth/login/route.ts` → `/notes/api/auth/login`.

### Autentikasi & keamanan

| Berkas | Isi |
|---|---|
| `src/lib/auth.ts` | JWT (`jose`): `createToken()`, `verifyToken()`, `isAuthenticated()`, `cookieMaxAge()`. Cookie `mynotes_session`. Masa berlaku **365 hari** (`SESSION_DURATION`) dan **diperpanjang otomatis** tiap `GET /auth/session` (sliding session) — token baru dikirim di body (`data.token`) + `Set-Cookie`. Mengganti `JWT_SECRET` mematikan semua token lama seketika. |
| `src/lib/rate-limit.ts` | Anti brute-force **di memori** (Map), **5 gagal / 5 menit per IP**. Hilang saat server restart. Kunci rate-limit dipakai per-konteks: `pin:<id>`, `cp:<ip>` (change-password), `pinapp:<ip>` (ubah PIN aplikasi). |
| `src/lib/pin.ts` | **PBKDF2-SHA256**, 100.000 iterasi. `hashPin()`, `verifyPin()`, `isValidPin()`. Format hash: `pbkdf2_sha256$<iter>$<salt-b64>$<hash-b64>`. **Dipakai ganda**: PIN catatan *dan* PIN aplikasi *dan* hash password. |
| `src/lib/settings.ts` | Tabel `settings` (key-value). Kunci: `password_hash`, `pin_hash`. Kalau `password_hash` belum ada → login fallback ke `NOTES_PASSWORD` di `.env` (plaintext). `DEFAULT_PIN` = PIN awal sebelum diganti pemilik. |
| `middleware.ts` | CORS untuk `/api/:path*`. Tolak origin tak dikenal (403); izinkan `ALLOWED_ORIGIN` + localhost/127.0.0.1. |
| `next.config.ts` | `basePath`, security headers (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`), `poweredByHeader: false`. |

Alur login: password dicek ke `settings.password_hash` (kalau sudah pernah diganti)
atau `NOTES_PASSWORD` (kalau belum). Sukses → JWT di cookie `httpOnly`.

### Endpoint API (`src/app/api/...`)

| Method | Path (di bawah `/notes`) | Fungsi |
|---|---|---|
| `POST` | `/api/auth/login` | Login password → set cookie |
| `POST` | `/api/auth/logout` | Hapus cookie |
| `GET` | `/api/auth/session` | Cek status login. **Memperpanjang token otomatis**: kirim token baru di `data.token` + `Set-Cookie`. Klien mobile WAJIB menyimpan `data.token`. |
| `GET` | `/api/auth/change-password` | **Status PIN** (masih PIN awal atau sudah diganti). Tidak membocorkan nilai PIN. |
| `POST` | `/api/auth/change-password` | **Ganti password.** Butuh `pin` + `current_password` + `new_password` + `confirm_password`. |
| `POST` | `/api/auth/pin` | **Ganti PIN aplikasi.** Butuh `pin_lama` + `pin_baru` + `konfirmasi_pin`. |
| `GET`/`POST` | `/api/notes` | Ambil semua / buat catatan |
| `GET`/`PATCH`/`DELETE` | `/api/notes/[id]` | Baca / ubah sebagian / (soft) hapus |
| `POST` | `/api/notes/[id]/restore` | Pulihkan dari sampah |
| `POST` | `/api/notes/[id]/unlock` | Buka catatan terkunci dengan PIN catatan |
| `GET` | `/api/events` | SSE real-time |
| `POST` | `/api/sync` | Sinkronisasi inkremental untuk mobile |

Format respons seragam lewat `src/lib/http.ts`:
`{ "data": ..., "server_time": "..." }`; error → `{ "error": "..." }`.

### Frontend (`src/components/`)

| Berkas | Isi |
|---|---|
| `notes-app.tsx` | Komponen utama: state login, daftar catatan, sidebar, pencarian, SSE, tombol header (Refresh / **Pengaturan Keamanan** / Logout). |
| `login.tsx` | Form login satu kolom password. |
| `note-card.tsx` | Kartu catatan + aksi pin/arsip/hapus. |
| `note-editor.tsx` | Modal editor catatan (judul, isi, warna, checklist, label, PIN catatan). |
| `settings-modal.tsx` | Modal **Pengaturan Keamanan**: tab **Ubah Password** (dengan verifikasi PIN) & tab **Ubah PIN**. |

Gaya CSS: **satu file** `src/app/globals.css` (minified, termasuk Tailwind import
di baris pertama). Kelas modal pengaturan berawalan `.settings-*`.

### Database (`prisma/schema.prisma`)

| Tabel | Isi |
|---|---|
| `notes` | Catatan. Kolom penting: `pin_hash` (PIN per-catatan, null = tidak terkunci), `checklist_items` & `labels` (JSON string), `trashed`/`archived`/`pinned`, `deleted_at`. |
| `settings` | `key` (PK) + `value`. Dipakai untuk `password_hash` & `pin_hash` aplikasi. |

Migrasi ada di `prisma/migrations/`. **Jangan** ubah kolom tanpa migrasi baru.

---

## 3. Model Keamanan (ringkas, penting)

Tiga hal berbeda, jangan tertukar:

1. **`NOTES_PASSWORD` (.env)** — password awal/fallback. Plaintext. Hanya dipakai
   kalau `settings.password_hash` belum ada.
2. **Password aplikasi (hash di `settings`)** — password login aktif setelah
   diganti lewat UI. Disimpan sebagai hash PBKDF2 lewat `hashPin()`.
3. **PIN aplikasi (hash di `settings.pin_hash`)** — "kunci" yang harus diketik
   **saat mau ganti password**. Bukan untuk login. PIN awal = `DEFAULT_PIN` di
   `src/lib/settings.ts`, dan sebaiknya diganti pemilik lewat tab **Ubah PIN**.
   ⚠️ Ada juga **PIN per-catatan** (`notes.pin_hash`) — itu fitur berbeda.

Ganti password dijaga **tiga lapis di server**: (a) wajib sesi login, (b) PIN
aplikasi benar, (c) `current_password` benar. Plus validasi: password baru ≥ 8
karakter, konfirmasi sama, tidak sama dengan yang lama. Semua dicek di
`src/app/api/auth/change-password/route.ts` — validasi client hanya untuk UX.

> 🔐 **Nilai password/PIN tidak boleh ditulis di file repo ini** (repo publik).
> Nilai aktif hanya ada di `.env` dan `prisma/data/notes.db`.

---

## 4. Skrip operasional (`scripts/`)

| Skrip | Fungsi |
|---|---|
| `pasang-password-pin.mjs` | **Reset** `password_hash` & `pin_hash` di tabel settings ke nilai awal proyek. Jalankan: `node scripts/pasang-password-pin.mjs`. Pakai ini kalau perlu mengembalikan kondisi bersih setelah pengujian. |
| `backup.ps1` | Backup `notes.db` ke `backups/` (simpan 30 terbaru). |
| `gen-password.ts` | Generator `JWT_SECRET` acak: `npx tsx scripts/gen-password.ts`. |
| `prepare-standalone.mjs` | Dipanggil otomatis oleh `npm run build`; menyalin `.next/static` & `public/` ke `.next/standalone/`. |
| `buat-docx.py` | Membuat dokumen Word dari dokumentasi (tidak dipakai runtime). |

---

## 5. Jebakan Lingkungan (hemat waktu debugging)

Ini sudah pernah memakan waktu — baca dulu sebelum curiga ke kode aplikasi.

1. **Build gagal `EBUSY: resource busy or locked, rmdir '.next/standalone'`**
   Penyebab: proses PM2 masih memegang file. Urutan benar: `pm2 stop notes` →
   (opsional) hapus `.next/standalone` → `npm run build` → `pm2 start notes`.
   ⚠️ Kalau build gagal setelah menghapus `standalone`, server lama masih hidup
   dari memori, tapi **akan mati begitu di-restart**. Jadi build wajib sukses.

2. **`curl` di Windows menafsirkan `/tmp/...` sebagai `C:\tmp`**
   Akibatnya file yang ditulis `curl` tidak sama dengan yang dihapus `rm` dari
   bash/MSYS. Selalu pakai path Windows eksplisit, mis. `C:/tmp/...`.

3. **Cookie sesi punya flag `Secure`** (karena `NODE_ENV=production`).
   curl & browser tetap mengirimnya di `http://localhost` (localhost dianggap
   konteks aman), tapi `http.cookiejar` Python menolaknya secara default.
   Solusi: `DefaultCookiePolicy(secure_protocols=("http","https"))` atau kelola
   cookie manual dari header. **Ini bukan bug aplikasi.**

4. **Rate-limit disimpan di memori.** Saat menguji banyak percobaan gagal,
   `pm2 restart notes` untuk mereset hitungan. Batasnya 5 gagal / 5 menit per IP.

5. **Autentikasi berbasis cookie, bukan token di URL.** Untuk menguji endpoint
   yang dilindungi: login dulu, ambil header `Set-Cookie`, kirim sebagai
   `-H "Cookie: <nilai>"`.

6. **`basePath: /notes`.** URL tanpa `/notes` akan 404. Saat mendeploy lewat
   Cloudflare Tunnel, aturan ingress `/notes*` harus **sebelum** catch-all.

7. **Aplikasi memakai `HOSTNAME=0.0.0.0`** (commit `e7e73de`) di
   `ecosystem.config.cjs` — jangan diubah ke `localhost`, tunnel akan putus.

8. **Cloudflare memblokir User-Agent tertentu.** Permintaan tanpa User-Agent
   dibalas **HTTP 403 `error code: 1010`** oleh Cloudflare (bukan oleh aplikasi),
   sehingga terlihat seolah server mati. Aplikasi mobile sudah menyetel
   User-Agent eksplisit (`NotesApi.userAgent`). Saat menguji dengan skrip,
   sertakan header User-Agent, mis. `-A "Dart/3.5 (dart:io)"`.

9. **Mobile & web memakai jalur sinkronisasi berbeda.**
   - Web  : `GET /api/notes` (tanpa `since`) → ambil semua.
   - Mobile: `GET /api/notes?since=<ISO>` untuk pull inkremental, `POST /api/notes`,
     `PATCH /api/notes/<id>`, `DELETE /api/notes/<id>`, `POST /api/notes/<id>/restore`,
     `DELETE /api/notes/<id>?permanent=true` — lewat header `Authorization: Bearer`,
     **bukan** cookie. (Endpoint `POST /api/sync` ada, tetapi mobile memakai `GET /api/notes?since=`.)
   Uji alur mobile: `python tools/uji_sync_mobile.py` (harness lokal di
   `<repo>/tools/`, tidak ikut ter-commit karena memuat kredensial uji).

10. **Token lewat HTTP 401 hanya dari endpoint ber-autentikasi.** `GET /api/notes`
    tanpa token membalas **401** (bukan 403) — kalau muncul 403, penyebabnya
    hampir pasti Cloudflare/middleware CORS, bukan autentikasi.

---

## 6. Fitur: status & letak kode

| Fitur | Status | Letak |
|---|---|---|
| Login single password + JWT | ✅ | `api/auth/login`, `lib/auth.ts` |
| Catatan (CRUD, 12 warna) | ✅ | `api/notes*`, `note-editor.tsx` |
| Checklist, label, pin, arsip, sampah, cari | ✅ | `api/notes*`, `notes-app.tsx` |
| Kunci catatan per-catatan (PIN) | ✅ | `api/notes/[id]/unlock`, `lib/pin.ts` |
| Real-time (SSE) & sync mobile | ✅ | `api/events`, `api/sync` |
| **Ganti password (verifikasi PIN)** | ✅ | `api/auth/change-password`, `settings-modal.tsx` |
| **Ganti PIN aplikasi** | ✅ | `api/auth/pin`, `settings-modal.tsx` |

Kalau menambah fitur keamanan baru yang menyimpan rahasia: simpan sebagai
**hash** (pakai `lib/pin.ts`) di tabel `settings`, jangan plaintext, dan jangan
tulis nilainya di dokumentasi.

---

## 7. Konvensi & pantangan

**Lakukan:**
- Validasi input server dengan **Zod** (`.strict()`) — lihat `lib/schemas.ts` & route baru.
- Bungkus respons dengan helper `response()` / `unauthorized()` dari `lib/http.ts`.
- Pakai pola `verifyPin(hashPin(...))` yang sudah ada; jangan bikin skema hash baru.
- Tambahkan header/komentar berbahasa Indonesia konsisten dengan file sekitar
  (proyek ini memakai komentar penjelasan gaya "untuk programmer PHP").
- Rate-limit setiap endpoint sensitif dengan kunci unik (mis. `cp:<ip>`).
- Jalankan `npx tsc --noEmit` + `npm run lint` sebelum menyatakan selesai.

**Jangan:**
- ❌ Menulis password/PIN asli ke file yang ter-commit (repo publik).
- ❌ Meninggalkan nilai hasil pengujian di `settings` — kembalikan dengan
  `node scripts/pasang-password-pin.mjs` dan **verifikasi** setelahnya.
- ❌ Mengubah `output: "standalone"` atau `basePath` tanpa menyesuaikan
  `ecosystem.config.cjs`, `start-with-env.js`, dan dokumentasi.
- ❌ Mengandalkan `npm run start` untuk menerapkan perubahan kode (itu hanya restart).
- ❌ Commit `.env`, `prisma/data/`, `backups/`, `runtime/` (sudah di `.gitignore`).

---

## 8. Checklist Debug Cepat

```
Halaman 404?                      → tambahkan /notes di URL
Login gagal padahal password benar → cek settings.password_hash vs NOTES_PASSWORD;
                                     login pakai password yang sedang aktif
Banyak respons 401 beruntun        → sesi/cookie; atau kena rate-limit (429 → tunggu 5 menit
                                     atau pm2 restart notes)
Selalu 429                         → rate-limit memori; restart untuk reset
Perubahan kode tidak muncul        → belum npm run build (pm2 restart saja tidak cukup)
Build EBUSY                        → pm2 stop notes dulu
PDF/aset tidak muncul              → prepare-standalone.mjs gagal / build belum jalan
```

---

## 9. Referensi Lain

- [README.md](README.md) — dokumentasi pengguna (fitur, instalasi, deploy)
- [PANDUAN.md](PANDUAN.md) — penjelasan kode lengkap untuk programmer PHP
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deployment Windows + Cloudflare Tunnel
- `node_modules/next/dist/docs/` — **dokumentasi Next.js versi terpasang** (wajib
  dirujuk karena versi ini punya perubahan breaking)
