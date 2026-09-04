// ============================================================================
// FILE: src/types/note.ts
// FUNGSI: Mendefinisikan bentuk data (tipe) yang dipakai di sisi client.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - TypeScript punya "tipe data" yang dicek saat compile, mirip
//   type-hint di PHP 8 (string, int, array) tapi jauh lebih ketat.
// - File ini seperti "kontrak": semua komponen tahu bentuk data Note.
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
  checklist_items: ChecklistItem[];
  labels: string[];
  created_at: string;        // string tanggal format ISO, bukan objek Date
  updated_at: string;
  deleted_at: string | null; // bisa null kalau catatan tidak di tong sampah
};

// Tampilan/halaman yang tersedia di aplikasi.
// `label:${string}` artinya string yang diawali "label:", misal "label:pekerjaan".
export type View = "notes" | "archive" | "trash" | `label:${string}`;
