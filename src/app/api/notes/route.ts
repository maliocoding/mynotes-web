// ============================================================================
// FILE: src/app/api/notes/route.ts
// FUNGSI: Endpoint untuk daftar & membuat catatan.
//   GET  /notes/api/notes        -> ambil semua catatan
//   POST /notes/api/notes        -> buat catatan baru
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Ini mirip file "notes.php" yang punya:
//     if ($_SERVER['REQUEST_METHOD'] === 'GET')  { ambil data... }
//     if ($_SERVER['REQUEST_METHOD'] === 'POST') { simpan data... }
// - db.note.findMany() mirip: SELECT * FROM notes ORDER BY ...
// - db.note.create()    mirip: INSERT INTO notes (...) VALUES (...)
// ============================================================================

import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { response, unauthorized } from "@/lib/http";
import { serializeNote } from "@/lib/notes";
import { noteInputSchema } from "@/lib/schemas";
import { broadcast } from "@/lib/events";

// ----------------------------------------------------------------------------
// GET: Ambil semua catatan, diurutkan: yang di-pin di atas, lalu terbaru.
// Mendukung query "?since=<tanggal>" untuk hanya mengambil yang berubah
// sejak waktu tertentu (dipakai untuk sinkronisasi incremental).
// Di PHP: /api/notes?since=2026-09-01 -> $_GET['since']
// ----------------------------------------------------------------------------
export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) return unauthorized();

  const url = new URL(request.url);
  const since = url.searchParams.get("since"); // ambil ?since= dari URL

  const notes = await db.note.findMany({
    // Kalau ada "since", filter: hanya yang updatedAt > since
    where: since ? { updatedAt: { gt: new Date(since) } } : undefined,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }], // pin dulu, lalu terbaru
  });

  // Ubah tiap catatan ke format JSON API lalu kirim
  return response(notes.map(serializeNote));
}

// ----------------------------------------------------------------------------
// POST: Buat catatan baru. Body: JSON sesuai noteInputSchema (boleh kosong {}).
// Mengembalikan status 201 (Created) beserta data catatan yang baru dibuat.
// ----------------------------------------------------------------------------
export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) return unauthorized();

  // Validasi input JSON dari client
  const parsed = noteInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ issues: parsed.error.flatten() }, { status: 400 }); // 400 = Bad Request

  // Pisahkan checklist_items & labels karena di database disimpan sebagai string JSON
  const { checklist_items, labels, ...input } = parsed.data;

  // Simpan ke database (mirip INSERT di PHP)
  const note = await db.note.create({
    data: {
      ...input, // title, body, color, pinned, dll (yang dikirim client)
      checklistItems: JSON.stringify(checklist_items ?? []), // array -> string JSON
      labels: JSON.stringify(labels ?? []),
    },
  });

  // Beri tahu semua browser lain bahwa ada catatan baru/berubah (real-time)
  broadcast("note-updated", note.id);

  return response(serializeNote(note), { status: 201 });
}
