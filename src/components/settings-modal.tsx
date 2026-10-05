// ============================================================================
// FILE: src/components/settings-modal.tsx
// FUNGSI: Modal "Pengaturan Keamanan" berisi 2 tab:
//         1. Ubah Password -> wajib memasukkan PIN verifikasi + password lama.
//         2. Ubah PIN      -> mengganti PIN verifikasi itu sendiri.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - "use client" wajib karena komponen ini pakai state & interaksi browser.
// - fetch() ke API mirip $.ajax di jQuery.
// - Semua pemeriksaan PENTING tetap dilakukan di server (route.ts); validasi
//   di sini hanya supaya user dapat umpan balik lebih cepat.
// ============================================================================

"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck, X } from "lucide-react";

type Tab = "password" | "pin";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("password");
  const [pesan, setPesan] = useState<{ tipe: "ok" | "err"; teks: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pinDefault, setPinDefault] = useState<boolean | null>(null);

  // Field form ubah password
  const [pin, setPin] = useState("");
  const [current, setCurrent] = useState("");
  const [baru, setBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");

  // Field form ubah PIN
  const [pinLama, setPinLama] = useState("");
  const [pinBaru, setPinBaru] = useState("");
  const [pinKonfirmasi, setPinKonfirmasi] = useState("");

  // Tampilkan/sembunyikan password
  const [lihat, setLihat] = useState(false);

  // Cek apakah PIN masih PIN awal (hanya status, bukan nilainya)
  useEffect(() => {
    fetch("/notes/api/auth/change-password")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPinDefault(j?.data?.pin_is_default ?? null))
      .catch(() => setPinDefault(null));
  }, []);

  function resetPesan() {
    setPesan(null);
  }

  // ---------------- Ubah password ----------------
  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    resetPesan();

    if (!/^\d{4,6}$/.test(pin)) return setPesan({ tipe: "err", teks: "PIN harus 4-6 digit angka." });
    if (baru.length < 8) return setPesan({ tipe: "err", teks: "Password baru minimal 8 karakter." });
    if (baru !== konfirmasi) return setPesan({ tipe: "err", teks: "Konfirmasi password tidak sama." });

    setLoading(true);
    const r = await fetch("/notes/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        current_password: current,
        new_password: baru,
        confirm_password: konfirmasi,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setLoading(false);

    if (r.ok) {
      setPesan({ tipe: "ok", teks: "Password berhasil diganti. Gunakan password baru saat login berikutnya." });
      setPin(""); setCurrent(""); setBaru(""); setKonfirmasi("");
    } else {
      setPesan({ tipe: "err", teks: j.error ?? "Gagal mengganti password." });
    }
  }

  // ---------------- Ubah PIN ----------------
  async function submitPin(e: FormEvent) {
    e.preventDefault();
    resetPesan();

    if (!/^\d{4,6}$/.test(pinLama)) return setPesan({ tipe: "err", teks: "PIN lama harus 4-6 digit angka." });
    if (!/^\d{4,6}$/.test(pinBaru)) return setPesan({ tipe: "err", teks: "PIN baru harus 4-6 digit angka." });
    if (pinBaru !== pinKonfirmasi) return setPesan({ tipe: "err", teks: "Konfirmasi PIN tidak sama." });

    setLoading(true);
    const r = await fetch("/notes/api/auth/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_lama: pinLama, pin_baru: pinBaru, konfirmasi_pin: pinKonfirmasi }),
    });
    const j = await r.json().catch(() => ({}));
    setLoading(false);

    if (r.ok) {
      setPesan({ tipe: "ok", teks: "PIN berhasil diganti. Ingat PIN baru Anda." });
      setPinLama(""); setPinBaru(""); setPinKonfirmasi("");
      setPinDefault(false);
    } else {
      setPesan({ tipe: "err", teks: j.error ?? "Gagal mengganti PIN." });
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* ---------- JUDUL ---------- */}
        <div className="settings-head">
          <ShieldCheck size={20} />
          <b>Pengaturan Keamanan</b>
          <button type="button" className="icon-btn" title="Tutup" onClick={onClose}><X size={18} /></button>
        </div>

        {/* ---------- TAB ---------- */}
        <div className="settings-tabs">
          <button type="button" className={tab === "password" ? "active" : ""} onClick={() => { setTab("password"); resetPesan(); }}>
            <LockKeyhole size={16} /> Ubah Password
          </button>
          <button type="button" className={tab === "pin" ? "active" : ""} onClick={() => { setTab("pin"); resetPesan(); }}>
            <KeyRound size={16} /> Ubah PIN
          </button>
        </div>

        {/* ---------- PERINGATAN PIN AWAL ---------- */}
        {pinDefault === true && (
          <div className="settings-warn">
            PIN masih memakai PIN awal. Sebaiknya ganti dulu di tab <b>Ubah PIN</b>.
          </div>
        )}

        {/* ---------- ISI TAB: UBAH PASSWORD ---------- */}
        {tab === "password" ? (
          <form className="settings-form" onSubmit={submitPassword}>
            <label>
              <span>PIN Verifikasi</span>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4-6 digit angka"
              />
              <small>PIN ini wajib diisi sebagai verifikasi sebelum password bisa diganti.</small>
            </label>

            <label>
              <span>Password Lama</span>
              <input
                type={lihat ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Password yang sedang dipakai"
              />
            </label>

            <label>
              <span>Password Baru</span>
              <input
                type={lihat ? "text" : "password"}
                value={baru}
                onChange={(e) => setBaru(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </label>

            <label>
              <span>Konfirmasi Password Baru</span>
              <input
                type={lihat ? "text" : "password"}
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </label>

            <button type="button" className="lihat-btn" onClick={() => setLihat(!lihat)}>
              {lihat ? <EyeOff size={15} /> : <Eye size={15} />} {lihat ? "Sembunyikan" : "Tampilkan"} password
            </button>

            {pesan && <div className={pesan.tipe === "ok" ? "settings-ok" : "error"}>{pesan.teks}</div>}

            <button type="submit" className="settings-submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        ) : (
          /* ---------- ISI TAB: UBAH PIN ---------- */
          <form className="settings-form" onSubmit={submitPin}>
            <label>
              <span>PIN Lama</span>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinLama}
                onChange={(e) => setPinLama(e.target.value.replace(/\D/g, ""))}
                placeholder="PIN yang sekarang"
              />
            </label>

            <label>
              <span>PIN Baru</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinBaru}
                onChange={(e) => setPinBaru(e.target.value.replace(/\D/g, ""))}
                placeholder="4-6 digit angka"
              />
            </label>

            <label>
              <span>Konfirmasi PIN Baru</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinKonfirmasi}
                onChange={(e) => setPinKonfirmasi(e.target.value.replace(/\D/g, ""))}
                placeholder="Ulangi PIN baru"
              />
            </label>

            {pesan && <div className={pesan.tipe === "ok" ? "settings-ok" : "error"}>{pesan.teks}</div>}

            <button type="submit" className="settings-submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan PIN Baru"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
