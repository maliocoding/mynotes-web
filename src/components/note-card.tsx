// ============================================================================
// FILE: src/components/note-card.tsx
// FUNGSI: Kartu tampilan satu catatan di halaman utama (grid).
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Komponen ini "bodoh" (presentational): hanya menampilkan data dan
//   meneruskan aksi ke induk lewat props (onOpen, onPatch, dst).
//   Semua logika database ada di komponen induk (notes-app.tsx).
// - e.stopPropagation() = menghentikan klik agar tidak "naik" ke elemen
//   induk. Di sini supaya klik tombol tidak ikut membuka editor.
// ============================================================================

"use client";

import { Archive, ArchiveRestore, Pin, PinOff, RotateCcw, Trash2 } from "lucide-react";
import type { Note } from "@/types/note";

// Definisi props yang diterima komponen ini
export function NoteCard({
  note,       // data catatan yang ditampilkan
  onOpen,     // dipanggil saat kartu diklik (buka editor)
  onPatch,    // dipanggil untuk mengubah sebagian data (pin/arsip)
  onDelete,   // dipanggil untuk menghapus (biasa atau permanen)
  onRestore,  // dipanggil untuk memulihkan dari sampah
}: {
  note: Note;
  onOpen: () => void;
  onPatch: (data: Partial<Note>) => void; // Partial = boleh kirim sebagian field saja
  onDelete: (permanent?: boolean) => void;
  onRestore: () => void;
}) {
  return (
    // Kelas CSS dinamis: warna kartu mengikuti note.color (misal "color-red")
    <article className={`note-card color-${note.color}`} onClick={onOpen}>

      {/* Tombol pin di pojok kartu. stopPropagation agar klik tombol
          tidak ikut membuka editor (onOpen). */}
      <button
        className="pin"
        title={note.pinned ? "Lepas pin" : "Pin"}
        onClick={(e) => {
          e.stopPropagation();
          onPatch({ pinned: !note.pinned }); // balik status pin
        }}
      >
        {note.pinned ? <PinOff size={18} /> : <Pin size={18} />}
      </button>

      {/* Judul & isi hanya ditampilkan kalau tidak kosong */}
      {note.title && <h3>{note.title}</h3>}
      {note.body && <p>{note.body}</p>}

      {/* Pratinjau checklist: tampilkan maksimal 6 item pertama */}
      {note.checklist_items.length > 0 && (
        <ul>
          {note.checklist_items.slice(0, 6).map((i) => (
            <li key={i.id} className={i.checked ? "done" : ""}>
              <span>{i.checked ? "☑" : "☐"}</span>
              {i.text}
            </li>
          ))}
        </ul>
      )}

      {/* Label-label catatan */}
      {note.labels.length > 0 && (
        <div className="labels">
          {note.labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}

      {/* Baris tombol aksi di bagian bawah kartu */}
      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        {note.trashed ? (
          // Kalau di tong sampah: tombol Pulihkan & Hapus Permanen
          <>
            <button title="Pulihkan" onClick={onRestore}>
              <RotateCcw size={18} />
            </button>
            <button title="Hapus permanen" onClick={() => onDelete(true)}>
              <Trash2 size={18} />
            </button>
          </>
        ) : (
          // Kalau normal: tombol Arsip & pindah ke Sampah
          <>
            <button
              title={note.archived ? "Kembalikan" : "Arsipkan"}
              onClick={() => onPatch({ archived: !note.archived })}
            >
              {note.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
            </button>
            <button title="Sampah" onClick={() => onDelete()}>
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
