// ============================================================================
// FILE: src/lib/notes.ts
// FUNGSI: Mengubah data catatan dari format database (Prisma)
//         menjadi format JSON yang dikirim ke browser.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Di database, checklist & labels disimpan sebagai STRING JSON (teks).
// - Di sini kita "JSON.parse" agar jadi array kembali sebelum dikirim ke client.
// - Mirip seperti json_decode() di PHP sebelum echo json_encode() response.
// - Perhatikan beda penamaan: database pakai camelCase (createdAt),
//   API memakai snake_case (created_at) agar konsisten dengan gaya REST API.
// ============================================================================

import type { Note } from "@prisma/client";

export function serializeNote(note: Note) {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    color: note.color,
    pinned: note.pinned,       // apakah catatan disematkan (pin) di atas
    archived: note.archived,   // apakah catatan diarsipkan
    trashed: note.trashed,     // apakah catatan ada di tong sampah
    checklist_items: JSON.parse(note.checklistItems), // string JSON -> array
    labels: JSON.parse(note.labels),                  // string JSON -> array
    // DateTime diubah ke string ISO (contoh: "2026-09-04T10:30:00.000Z")
    created_at: note.createdAt.toISOString(),
    updated_at: note.updatedAt.toISOString(),
    // "?." = optional chaining: kalau deletedAt null, hasilnya null (bukan error)
    // "??" = kalau kiri null/undefined, pakai nilai kanan
    deleted_at: note.deletedAt?.toISOString() ?? null,
  };
}
