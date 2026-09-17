// ============================================================================
// FILE: src/lib/schemas.ts
// FUNGSI: Validasi data yang masuk dari client menggunakan library "zod".
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Zod mirip validation di Laravel: $request->validate([...]).
// - Semua input dari luar WAJIB divalidasi dulu sebelum masuk database.
// - ".strict()" artinya field yang tidak dikenal akan DITOLAK (keamanan ekstra).
// ============================================================================

import { z } from "zod";

// Skema untuk satu item checklist (daftar centang di dalam catatan)
export const checklistItemSchema = z.object({
  id: z.string(),                    // ID unik item
  text: z.string().max(10_000),      // teks item, maksimal 10 ribu karakter
  checked: z.boolean(),              // sudah dicentang atau belum
  order: z.number().int(),           // urutan item (bilangan bulat)
});

// Skema untuk data catatan (note) yang dikirim client saat membuat/mengedit.
// Semua field ".optional()" karena PATCH bisa mengirim sebagian field saja.
export const noteInputSchema = z.object({
  title: z.string().max(20_000).optional(),   // judul, maks 20 ribu karakter
  body: z.string().max(100_000).optional(),   // isi catatan, maks 100 ribu karakter
  // Warna hanya boleh salah satu dari daftar ini (mirip enum di database)
  color: z.enum(["default", "red", "orange", "yellow", "green", "teal", "blue", "darkblue", "purple", "pink", "brown", "gray"]).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  trashed: z.boolean().optional(),
  pin: z.string().regex(/^\d{4,6}$/).optional(),   // atur/kunci catatan dengan PIN numerik 4-6 digit
  remove_pin: z.boolean().optional(),              // lepas PIN (buka kunci permanen)
  checklist_items: z.array(checklistItemSchema).max(500).optional(), // maks 500 item
  labels: z.array(z.string().trim().min(1).max(50)).max(100).optional(), // maks 100 label
}).strict(); // Tolak field asing yang tidak ada di skema

// Membuat tipe TypeScript otomatis dari skema di atas.
// Jadi kita tidak perlu menulis tipe dua kali.
export type NoteInput = z.infer<typeof noteInputSchema>;
