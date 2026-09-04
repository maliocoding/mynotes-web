// ============================================================================
// FILE: next.config.ts (di root proyek)
// FUNGSI: Konfigurasi utama Next.js.
// ============================================================================

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aplikasi diakses lewat sub-path "/notes" (misal https://domain.com/notes).
  // Semua URL aset & API otomatis diawali /notes.
  basePath: "/notes",

  // Hasil build berupa server Node.js mandiri (standalone) yang ringan,
  // cocok untuk deployment tanpa node_modules besar.
  output: "standalone",

  // Sembunyikan header "X-Powered-By: Next.js" (sedikit mengurangi info ke attacker)
  poweredByHeader: false,

  // Header keamanan yang dipasang di SEMUA respons:
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },              // cegah tebakan tipe file oleh browser
        { key: "X-Frame-Options", value: "DENY" },                        // cegah situs lain membingkai (iframe) aplikasi ini (anti clickjacking)
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // batasi info referrer yang bocor
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }, // matikan akses kamera/mikro/lokasi
      ],
    }];
  },
};

export default nextConfig;
