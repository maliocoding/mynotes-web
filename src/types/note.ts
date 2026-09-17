// ============================================================================
// FILE: src/types/note.ts
// FUNGSI: Mendefinisikan bentuk data (tipe) yang dipakai di sisi client.
// ============================================================================

// Satu item dalam checklist (daftar centang)
export type ChecklistItem = { id: string; text: string; checked: boolean; order: number };

// Bentuk data satu catatan, persis seperti yang dikirim API (lihat lib/notes.ts)
export type Note = {
  id: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  locked: boolean;              // apakah catatan terkunci PIN
  pin_hash: string | null;      // hash PIN (BUKAN PIN asli)
  checklist_items: ChecklistItem[];
  labels: string[];
  created_at: string;        // string tanggal format ISO, bukan objek Date
  updated_at: string;
  deleted_at: string | null; // bisa null kalau catatan tidak di tong sampah
};

// Tampilan/halaman yang tersedia di aplikasi.
export type View = "notes" | "archive" | "trash" | `label:${string}`;
