// ============================================================================
// FILE: src/app/api/sync/route.ts
// FUNGSI: Sinkronisasi incremental. Alamatnya: POST /notes/api/sync
// Client mengirim waktu terakhir sync ("since"), server membalas hanya
// catatan yang berubah SETELAH waktu itu. Hemat bandwidth.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Mirip: SELECT * FROM notes WHERE updated_at > '$since' ORDER BY updated_at
// - new Date(0) = awal waktu Unix (1 Jan 1970), artinya "ambil semua"
//   kalau client tidak mengirim "since".
// ============================================================================

import { isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { response, unauthorized } from "@/lib/http";
import { serializeNote } from "@/lib/notes";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) return unauthorized();

  // Ambil body JSON; kalau gagal di-parse, anggap objek kosong
  const body = await request.json().catch(() => ({}));

  // Tentukan batas waktu: pakai body.since kalau ada, kalau tidak ambil dari awal
  const since = typeof body.since === "string" ? new Date(body.since) : new Date(0);

  // Ambil semua catatan yang berubah setelah "since", urut dari yang paling lama
  const notes = await db.note.findMany({
    where: { updatedAt: { gt: since } }, // "gt" = greater than (lebih besar dari)
    orderBy: { updatedAt: "asc" },
  });

  return response(notes.map((n) => serializeNote(n)));
}
