// ============================================================================
// FILE: src/app/api/events/route.ts
// FUNGSI: Endpoint SSE (Server-Sent Events). Alamatnya: GET /notes/api/events
// Browser "berlangganan" ke endpoint ini, lalu server bisa MENDORONG
// (push) notifikasi kapan pun ada catatan yang berubah — secara real-time.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Ini konsep yang sulit dilakukan di PHP biasa, mirip WebSocket/Pusher.
// - Browser memakai "new EventSource(url)" untuk mendengarkan.
// - Koneksi HTTP-nya dibiarkan TERBUKA terus, server kirim pesan kapan saja.
// ============================================================================

import { isAuthenticated } from "@/lib/auth";
import { noteListeners } from "@/lib/events";

// "force-dynamic" = jangan pernah cache endpoint ini, selalu jalankan langsung
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Hanya user yang sudah login yang boleh berlangganan event
  if (!(await isAuthenticated(request))) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder(); // untuk mengubah string menjadi bytes
  let listener: ((value: string) => void) | undefined;

  // ReadableStream = aliran data yang tetap terbuka.
  const stream = new ReadableStream({
    // "start" dipanggil saat browser mulai terhubung
    start(controller) {
      // Daftarkan fungsi listener: setiap ada broadcast(), kirim pesannya ke browser ini
      listener = (value) => controller.enqueue(encoder.encode(value));
      noteListeners.add(listener);
      // Kirim event pembuka supaya browser tahu koneksi berhasil
      controller.enqueue(encoder.encode("event: connected\ndata: {}\n\n"));
    },
    // "cancel" dipanggil saat browser menutup koneksi -> hapus listener-nya
    cancel() {
      if (listener) noteListeners.delete(listener);
    },
  });

  // Kembalikan stream dengan header khusus SSE
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",        // memberi tahu browser ini adalah SSE
      "Cache-Control": "no-cache, no-transform",  // jangan di-cache oleh proxy
      Connection: "keep-alive",                   // jaga koneksi tetap hidup
    },
  });
}
