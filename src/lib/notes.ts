// ============================================================================
// FILE: src/lib/notes.ts
// FUNGSI: Mengubah data catatan dari format database (Prisma)
//         menjadi format JSON yang dikirim ke browser/aplikasi.
//
// ATURAN CATATAN TERKUNCI (locked):
// - Bila catatan punya pin_hash, isi (title, body, checklist, label) DIKOSONGKAN
//   pada respons biasa. Client wajib meminta unlock dengan PIN untuk melihat isi.
// - `pin_hash` (hash PIN, BUKAN PIN asli) tetap dikirim agar client dapat
//   memverifikasi PIN secara offline.
// ============================================================================

import type { Note } from "@prisma/client";

export function serializeNote(note: Note, opts?: { unlocked?: boolean }) {
  const locked = note.pinHash != null;
  // Saat catatan sudah dibuka kuncinya (unlocked), jangan samarkan isinya.
  const reveal = locked === false || opts?.unlocked === true;
  return {
    id: note.id,
    title: reveal ? note.title : "",
    body: reveal ? note.body : "",
    color: note.color,
    pinned: note.pinned,       // apakah catatan disematkan (pin) di atas
    archived: note.archived,   // apakah catatan diarsipkan
    trashed: note.trashed,     // apakah catatan ada di tong sampah
    locked,                    // apakah catatan terkunci PIN
    pin_hash: note.pinHash,    // hash PIN (null = tidak terkunci). BUKAN PIN asli.
    checklist_items: reveal ? JSON.parse(note.checklistItems) : [], // string JSON -> array
    labels: reveal ? JSON.parse(note.labels) : [],                  // string JSON -> array
    // DateTime diubah ke string ISO (contoh: "2026-09-04T10:30:00.000Z")
    created_at: note.createdAt.toISOString(),
    updated_at: note.updatedAt.toISOString(),
    // "?." = optional chaining: kalau deletedAt null, hasilnya null (bukan error)
    deleted_at: note.deletedAt?.toISOString() ?? null,
  };
}
