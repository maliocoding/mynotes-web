// ============================================================================
// FILE: src/app/api/notes/[id]/unlock/route.ts
// FUNGSI: Membuka (unlock) catatan yang terkunci PIN.
//         POST /notes/api/notes/:id/unlock  { "pin": "1234" }
//
// KEAMANAN:
// - Rate-limit 5x gagal per menit per catatan untuk mencegah brute-force PIN.
// - Jika PIN benar, seluruh isi catatan dikembalikan (sekali saja, untuk
//   disimpan klien). Catatan tetap terkunci di database.
// ============================================================================

import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { response, unauthorized } from "@/lib/http";
import { serializeNote } from "@/lib/notes";
import { verifyPin } from "@/lib/pin";
import { checkRateLimit, recordFailure, clearFailures } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated(request))) return unauthorized();

  const id = (await params).id;
  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";

  // Rate-limit percobaan PIN per catatan
  const limit = checkRateLimit(`pin:${id}`);
  if (!limit.allowed)
    return response({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });

  const note = await db.note.findUnique({ where: { id } });
  if (!note) return response(null, { status: 404 });

  if (!note.pinHash || !verifyPin(pin, note.pinHash)) {
    recordFailure(`pin:${id}`);
    return response({ error: "PIN salah." }, { status: 401 });
  }

  clearFailures(`pin:${id}`);
  return response(serializeNote(note, { unlocked: true }));
}
