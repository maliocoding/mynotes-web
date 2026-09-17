// ============================================================================
// FILE: src/components/note-editor.tsx
// FUNGSI: Jendela modal untuk mengedit satu catatan (judul, isi, warna,
//         checklist, label, arsip, hapus, kunci PIN).
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Perubahan TIDAK langsung disimpan. Kita pakai "draft" (salinan sementara).
//   Saat pengguna menekan "Tutup", draft baru dikirim via onSave.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { Archive, CheckSquare, Lock, LockOpen, Palette, Pin, Tag, Trash2, X } from "lucide-react";
import type { ChecklistItem, Note } from "@/types/note";

// Daftar warna yang tersedia (harus sama dengan enum di lib/schemas.ts)
const colors = ["default", "red", "orange", "yellow", "green", "teal", "blue", "darkblue", "purple", "pink", "brown", "gray"];

// Payload yang bisa dikirim saat menyimpan: field catatan + pengaturan PIN
export type SavePayload = Partial<Note> & { pin?: string; remove_pin?: boolean };

export function NoteEditor({
  note,     // catatan asli yang sedang diedit
  onClose,  // tutup modal
  onSave,   // simpan perubahan ke server (async)
  onDelete, // pindahkan ke sampah
}: {
  note: Note;
  onClose: () => void;
  onSave: (data: SavePayload) => Promise<void>;
  onDelete: () => void;
}) {
  // "draft" = salinan catatan yang sedang diedit (belum tersimpan)
  const [draft, setDraft] = useState(note);
  // Mode checklist aktif kalau catatan sudah punya item checklist
  const [checkMode, setCheckMode] = useState(note.checklist_items.length > 0);
  // Status pengaturan PIN yang belum disimpan
  const [pinToSet, setPinToSet] = useState<string | null>(null);
  const [removePin, setRemovePin] = useState(false);

  // Kalau catatan yang dibuka berganti, reset draft-nya
  useEffect(() => { setDraft(note); setPinToSet(null); setRemovePin(false); }, [note]);

  // Helper kecil untuk mengubah sebagian field draft
  const update = (data: Partial<Note>) => setDraft((d) => ({ ...d, ...data }));

  // Simpan draft ke server lalu tutup modal
  async function close() {
    await onSave({
      title: draft.title,
      body: draft.body,
      color: draft.color,
      pinned: draft.pinned,
      archived: draft.archived,
      checklist_items: draft.checklist_items,
      labels: draft.labels,
      ...(removePin ? { remove_pin: true } : pinToSet ? { pin: pinToSet } : {}),
    });
    onClose();
  }

  // Tambah satu item checklist kosong baru
  function addCheck() {
    update({
      checklist_items: [
        ...draft.checklist_items,
        { id: crypto.randomUUID(), text: "", checked: false, order: draft.checklist_items.length },
      ],
    });
  }

  // Ubah satu item checklist berdasarkan id-nya
  function updateCheck(id: string, data: Partial<ChecklistItem>) {
    update({
      checklist_items: draft.checklist_items.map((i) => (i.id === id ? { ...i, ...data } : i)),
    });
  }

  // Atur PIN baru: minta input 4-6 digit
  function handleLock() {
    const value = prompt("Masukkan PIN baru (4-6 digit angka) untuk mengunci catatan ini:");
    if (value === null) return;
    if (!/^\d{4,6}$/.test(value.trim())) {
      alert("PIN harus 4-6 digit angka.");
      return;
    }
    setPinToSet(value.trim());
    setRemovePin(false);
  }

  // Lepas PIN (buka kunci permanen)
  function handleUnlockPin() {
    if (confirm("Lepas PIN dari catatan ini? Catatan akan terbuka tanpa PIN.")) {
      setRemovePin(true);
      setPinToSet(null);
    }
  }

  const hasPin = draft.pin_hash != null;

  return (
    // Klik area gelap di luar modal = tutup & simpan
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <section className={`editor color-${draft.color}`}>

        {/* Tombol pin */}
        <button className="editor-pin" onClick={() => update({ pinned: !draft.pinned })}>
          <Pin size={20} fill={draft.pinned ? "currentColor" : "none"} />
        </button>

        {/* Kolom judul */}
        <input className="title-input" value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="Judul" />

        {/* Isi: mode checklist ATAU textarea biasa */}
        {checkMode ? (
          <div className="check-editor">
            {draft.checklist_items.map((i) => (
              <div key={i.id}>
                <input type="checkbox" checked={i.checked} onChange={(e) => updateCheck(i.id, { checked: e.target.checked })} />
                <input value={i.text} className={i.checked ? "done" : ""} onChange={(e) => updateCheck(i.id, { text: e.target.value })} placeholder="Item daftar" />
                {/* Hapus item ini dari daftar */}
                <button onClick={() => update({ checklist_items: draft.checklist_items.filter((x) => x.id !== i.id) })}>
                  <X size={16} />
                </button>
              </div>
            ))}
            <button className="add-item" onClick={addCheck}>+ Item daftar</button>
          </div>
        ) : (
          <textarea value={draft.body} onChange={(e) => update({ body: e.target.value })} placeholder="Tulis catatan..." />
        )}

        {/* Pilihan warna catatan */}
        <div className="color-picker">
          {colors.map((c) => (
            <button key={c} title={c} className={`swatch color-${c} ${draft.color === c ? "selected" : ""}`} onClick={() => update({ color: c })} />
          ))}
        </div>

        {/* Baris tombol aksi bawah */}
        <div className="editor-actions">
          <button title="Checklist" onClick={() => setCheckMode(!checkMode)}><CheckSquare size={19} /></button>
          <button title="Warna"><Palette size={19} /></button>
          {/* Label diketik manual lewat prompt, dipisah koma */}
          <button title="Label" onClick={() => {
            const value = prompt("Label (pisahkan dengan koma)", draft.labels.join(", "));
            if (value !== null) update({ labels: value.split(",").map((x) => x.trim()).filter(Boolean) });
          }}><Tag size={19} /></button>
          <button title="Arsip" onClick={() => update({ archived: !draft.archived })}><Archive size={19} /></button>
          {/* Kunci / lepas PIN */}
          {hasPin || pinToSet ? (
            <button title="Lepas PIN" onClick={handleUnlockPin}><LockOpen size={19} /></button>
          ) : (
            <button title="Kunci dengan PIN" onClick={handleLock}><Lock size={19} /></button>
          )}
          <button title="Sampah" onClick={onDelete}><Trash2 size={19} /></button>
          <button className="close-editor" onClick={close}>Tutup</button>
        </div>
      </section>
    </div>
  );
}
