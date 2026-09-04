// ============================================================================
// FILE: src/components/notes-app.tsx
// FUNGSI: Komponen UTAMA aplikasi. Mengatur semuanya: status login,
//         daftar catatan, pencarian, tampilan (catatan/arsip/sampah/label),
//         pembuatan & pengeditan catatan, serta sinkronisasi real-time (SSE).
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Ini mirip "controller + view" utama kalau di PHP MVC.
// - Semua perubahan data dilakukan lewat fetch() ke API, lalu state
//   diperbarui sehingga tampilan ikut berubah otomatis (tanpa reload halaman).
// - Alur login: komponen pertama kali mencoba load catatan. Kalau API
//   menjawab 401, berarti belum login -> tampilkan halaman Login.
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, LogOut, Menu, RefreshCw, Search, StickyNote, Tag, Trash2, X } from "lucide-react";
import { Login } from "./login";
import { NoteCard } from "./note-card";
import { NoteEditor } from "./note-editor";
import type { Note, View } from "@/types/note";

// Template catatan kosong (dipakai sebagai nilai awal)
const emptyNote: Note = {
  id: "", title: "", body: "", color: "default",
  pinned: false, archived: false, trashed: false,
  checklist_items: [], labels: [],
  created_at: "", updated_at: "", deleted_at: null,
};

export function NotesApp() {
  // ------------------------- STATE (data reaktif) -------------------------
  // auth: null = belum tahu (sedang cek), true = sudah login, false = belum
  const [auth, setAuth] = useState<boolean | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);      // semua catatan dari server
  const [view, setView] = useState<View>("notes");     // tampilan aktif (notes/arsip/sampah/label)
  const [query, setQuery] = useState("");              // teks pencarian
  const [editor, setEditor] = useState<Note | null>(null); // catatan yang sedang dibuka di editor
  const [menu, setMenu] = useState(false);             // sidebar terbuka? (untuk tampilan HP)

  // ------------------------- MEMUAT DATA -------------------------
  // load(): ambil semua catatan dari API.
  // useCallback = fungsi ini "diingat" agar tidak dibuat ulang tiap render
  // (penting supaya aman dipakai di dalam useEffect).
  const load = useCallback(async () => {
    const r = await fetch("/notes/api/notes");
    if (r.status === 401) { setAuth(false); return; } // belum login
    if (r.ok) {
      setNotes((await r.json()).data);
      setAuth(true); // berhasil memuat -> berarti sudah login
    }
  }, []);

  // Jalankan load() sekali saat komponen pertama tampil.
  // Array kosong [] artinya "hanya sekali saat awal".
  useEffect(() => { load(); }, [load]);

  // ------------------------- REAL-TIME (SSE) -------------------------
  // Setelah login, buka koneksi EventSource ke /api/events.
  // Setiap ada event "note-updated"/"note-deleted" dari server,
  // panggil load() supaya daftar catatan selalu terbaru.
  useEffect(() => {
    if (!auth) return; // hanya jalan kalau sudah login
    const events = new EventSource("/notes/api/events");
    events.addEventListener("note-updated", load);
    events.addEventListener("note-deleted", load);
    events.onerror = () => {}; // abaikan error koneksi (akan reconnect otomatis)
    // Fungsi cleanup: tutup koneksi saat komponen dilepas / auth berubah
    return () => events.close();
  }, [auth, load]);

  // ------------------------- AKSI (memanggil API) -------------------------

  // Buat catatan kosong baru, lalu langsung buka di editor
  async function create() {
    const r = await fetch("/notes/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (r.ok) {
      const n = (await r.json()).data;
      setNotes((x) => [n, ...x]); // taruh catatan baru di urutan teratas
      setEditor(n);               // langsung buka editor-nya
    }
  }

  // Ubah sebagian data catatan (pin, arsip, judul, dll)
  async function patch(id: string, data: Partial<Note>) {
    const r = await fetch(`/notes/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      const n = (await r.json()).data;
      // Ganti catatan lama dengan versi baru di state
      setNotes((x) => x.map((v) => (v.id === id ? n : v)));
    }
  }

  // Hapus catatan. permanent=true -> hapus selamanya (dengan konfirmasi)
  async function remove(id: string, permanent = false) {
    if (permanent && !confirm("Hapus permanen? Tindakan ini tidak dapat dibatalkan.")) return;
    await fetch(`/notes/api/notes/${id}${permanent ? "?permanent=true" : ""}`, { method: "DELETE" });
    setEditor(null); // tutup editor kalau sedang terbuka
    load();          // muat ulang daftar
  }

  // Pulihkan catatan dari tong sampah
  async function restore(id: string) {
    await fetch(`/notes/api/notes/${id}/restore`, { method: "POST" });
    load();
  }

  // ------------------------- TURUNAN DATA (computed) -------------------------

  // Kumpulkan semua label unik dari semua catatan, urutkan A-Z.
  // useMemo = hitung ulang HANYA kalau "notes" berubah (hemat tenaga).
  const labels = useMemo(() => [...new Set(notes.flatMap((n) => n.labels))].sort(), [notes]);

  // Filter catatan yang tampil sesuai tampilan aktif + kata kunci pencarian
  const visible = useMemo(
    () =>
      notes.filter((n) => {
        // Aturan tiap tampilan:
        if (view === "notes" && (n.archived || n.trashed)) return false;      // utama: bukan arsip/sampah
        if (view === "archive" && (!n.archived || n.trashed)) return false;   // arsip: harus archived
        if (view === "trash" && !n.trashed) return false;                     // sampah: harus trashed
        // tampilan label: harus punya label tsb & tidak di sampah
        if (view.startsWith("label:") && (!n.labels.includes(view.slice(6)) || n.trashed)) return false;
        // Filter pencarian (cocok di judul, isi, atau item checklist)
        const q = query.toLowerCase();
        return (
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.checklist_items.some((i) => i.text.toLowerCase().includes(q))
        );
      }),
    [notes, view, query]
  );

  // ------------------------- TAMPILAN (JSX) -------------------------

  // Saat status login belum diketahui -> tampilkan layar loading
  if (auth === null)
    return (
      <div className="loading">
        <StickyNote size={40} />
        <span>Memuat MyNotes...</span>
      </div>
    );

  // Kalau belum login -> tampilkan form login
  if (!auth) return <Login onSuccess={load} />;

  // Helper pindah tampilan sekaligus tutup menu sidebar (di HP)
  const nav = (v: View) => { setView(v); setMenu(false); };

  return (
    <div className="app-shell">
      {/* ---------- HEADER ATAS ---------- */}
      <header>
        <button className="icon-btn" onClick={() => setMenu(!menu)}><Menu /></button>
        <div className="brand"><StickyNote color="#fbbc04" fill="#fbbc04" /><b>MyNotes</b></div>
        {/* Kolom pencarian */}
        <div className="search">
          <Search size={20} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Telusuri catatan" />
          {query && <button onClick={() => setQuery("")}><X size={20} /></button>}
        </div>
        <button className="icon-btn hide-mobile" title="Refresh" onClick={load}><RefreshCw /></button>
        {/* Logout: panggil API logout lalu ubah state auth */}
        <button className="icon-btn" title="Logout" onClick={async () => {
          await fetch("/notes/api/auth/logout", { method: "POST" });
          setAuth(false);
        }}><LogOut /></button>
      </header>

      {/* ---------- SIDEBAR KIRI ---------- */}
      <aside className={menu ? "open" : ""}>
        <button className={view === "notes" ? "active" : ""} onClick={() => nav("notes")}><StickyNote /><span>Catatan</span></button>
        <button className={view === "archive" ? "active" : ""} onClick={() => nav("archive")}><Archive /><span>Arsip</span></button>
        <button className={view === "trash" ? "active" : ""} onClick={() => nav("trash")}><Trash2 /><span>Sampah</span></button>
        {/* Daftar label dibuat dinamis dari data */}
        {labels.map((l) => (
          <button key={l} className={view === `label:${l}` ? "active" : ""} onClick={() => nav(`label:${l}`)}><Tag /><span>{l}</span></button>
        ))}
      </aside>

      {/* ---------- ISI UTAMA ---------- */}
      <main className="notes-main">
        <button className="create-note" onClick={create}><span>Buat catatan...</span><StickyNote size={20} /></button>
        <h2>{view === "notes" ? "Catatan" : view === "archive" ? "Arsip" : view === "trash" ? "Sampah" : view.slice(6)}</h2>

        {visible.length === 0 ? (
          // Tampilan kalau tidak ada catatan yang cocok
          <div className="empty">
            <StickyNote size={80} />
            <p>{query ? "Tidak ada hasil." : "Belum ada catatan di sini."}</p>
          </div>
        ) : (
          // Grid berisi kartu-kartu catatan
          <section className="note-grid">
            {visible.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onOpen={() => setEditor(n)}
                onPatch={(d) => patch(n.id, d)}
                onDelete={(p) => remove(n.id, p)}
                onRestore={() => restore(n.id)}
              />
            ))}
          </section>
        )}
      </main>

      {/* ---------- MODAL EDITOR (muncul kalau ada catatan yang dibuka) ---------- */}
      {editor && (
        <NoteEditor
          note={editor}
          onClose={() => setEditor(null)}
          onSave={(d) => patch(editor.id, d)}
          onDelete={() => remove(editor.id)}
        />
      )}
    </div>
  );
}
