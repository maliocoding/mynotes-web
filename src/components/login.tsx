// ============================================================================
// FILE: src/components/login.tsx
// FUNGSI: Halaman/form login aplikasi.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Baris "use client" WAJIB ada kalau komponen pakai interaksi browser
//   (state, onClick, onSubmit). Tanpa itu, komponen di-render di server saja.
// - "useState" mirip variabel, tapi kalau nilainya berubah, tampilan ikut
//   diperbarui otomatis (reactive). Ini inti dari React.
// - JSX = menulis HTML di dalam JavaScript. Mirip echo HTML di PHP,
//   tapi di-compile dan type-safe.
// - fetch("/notes/api/auth/login") mirip memanggil API via AJAX/jQuery.
// ============================================================================

"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, StickyNote } from "lucide-react"; // library ikon

// Komponen menerima "props" (parameter) dari induknya.
// Di sini: onSuccess = fungsi yang dipanggil setelah login berhasil.
export function Login({ onSuccess }: { onSuccess: () => void }) {
  // State: pasangan [nilai, fungsiPengubahNilai]
  const [password, setPassword] = useState("");   // isi kolom password
  const [error, setError] = useState("");         // pesan error (kalau ada)
  const [loading, setLoading] = useState(false);  // sedang memproses login?

  // Dipanggil saat form disubmit (tombol "Masuk" ditekan)
  async function submit(e: FormEvent) {
    e.preventDefault();        // cegah form reload halaman (perilaku bawaan HTML)
    setLoading(true);
    setError("");

    // Kirim password ke API login (mirip $.ajax POST di jQuery)
    const res = await fetch("/notes/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    if (res.ok) onSuccess();   // login berhasil -> kabari komponen induk
    else setError((await res.json()).error ?? "Login gagal"); // tampilkan pesan error dari server
  }

  // Bagian return = tampilan HTML komponen (JSX)
  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><StickyNote size={32} /></div>
        <h1>MyNotes</h1>
        <p>Catatan pribadi Anda, aman dan tersinkron.</p>
        <label>
          <span>Password</span>
          <div className="password-field">
            <LockKeyhole size={18} />
            {/* Input "controlled": nilainya diikat ke state password.
                Setiap ketikan memanggil setPassword. */}
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
            />
          </div>
        </label>
        {/* Pesan error hanya tampil kalau state error tidak kosong */}
        {error && <div className="error">{error}</div>}
        {/* Tombol dimatikan saat loading agar tidak double-submit */}
        <button disabled={loading}>{loading ? "Memeriksa..." : "Masuk"}</button>
      </form>
    </main>
  );
}
