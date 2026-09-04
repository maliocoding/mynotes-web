// ============================================================================
// FILE: src/lib/events.ts
// FUNGSI: Sistem "broadcast" real-time memakai Server-Sent Events (SSE).
//         Saat ada catatan yang berubah, semua browser yang terhubung
//         akan langsung diberi tahu agar tampilannya ikut diperbarui.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Ini mirip konsep WebSocket / Pusher / Laravel Echo.
// - "noteListeners" adalah daftar semua browser yang sedang mendengarkan.
// - "broadcast()" mengirim pesan ke SEMUA pendengar sekaligus.
// ============================================================================

// Tipe data untuk fungsi pendengar (listener): menerima string, tidak mengembalikan apa-apa
type Listener = (payload: string) => void;

// Simpan daftar pendengar di variabel global supaya tidak hilang saat hot-reload
const globalEvents = globalThis as unknown as { noteListeners?: Set<Listener> };
export const noteListeners = globalEvents.noteListeners ?? new Set<Listener>();
globalEvents.noteListeners = noteListeners;

// ----------------------------------------------------------------------------
// Fungsi: broadcast(type, id)
// Mengirim event ke semua browser yang terhubung lewat SSE.
//   - type: jenis event, misal "note-updated" atau "note-deleted"
//   - id  : ID catatan yang berubah
// Format pesannya mengikuti standar SSE: "event: <nama>\ndata: <json>\n\n"
// ----------------------------------------------------------------------------
export function broadcast(type: string, id: string) {
  const payload = `event: ${type}\ndata: ${JSON.stringify({ id, at: new Date().toISOString() })}\n\n`;
  // Kirim payload ke setiap pendengar (browser) yang terdaftar
  noteListeners.forEach((listener) => listener(payload));
}
