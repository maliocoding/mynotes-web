// ============================================================================
// FILE: src/app/page.tsx
// FUNGSI: Halaman utama aplikasi (URL: /notes).
// Di Next.js App Router, "page.tsx" = halaman yang bisa dikunjungi.
// Mirip "index.php". File ini hanya menampilkan komponen utama NotesApp.
// ============================================================================

import { NotesApp } from "@/components/notes-app";

export default function Home() {
  return <NotesApp />;
}
