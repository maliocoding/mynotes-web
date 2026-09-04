// ============================================================================
// FILE: middleware.ts (di root proyek)
// FUNGSI: Mengatur CORS (Cross-Origin Resource Sharing) untuk semua API.
//         Middleware dijalankan SEBELUM request mencapai route API.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - Mirip kode di awal file PHP yang mengatur header CORS:
//     header('Access-Control-Allow-Origin: ...');
// - CORS diperlukan kalau API dipanggil dari domain/aplikasi lain
//   (misal aplikasi Android atau website lain).
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

// Membuat header CORS standar untuk origin yang diizinkan
const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  Vary: "Origin",
});

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  // Request tanpa header Origin (misal dari browser biasa/curl) -> lanjut saja
  if (!origin) return NextResponse.next();

  // Hanya izinkan origin dari .env (ALLOWED_ORIGIN) atau localhost (untuk development)
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  let allowed = origin === allowedOrigin;
  try {
    const url = new URL(origin);
    // Izinkan juga http://localhost dan http://127.0.0.1 (port berapa pun)
    allowed ||= url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    allowed = false;
  }
  // Origin tidak dikenal -> tolak dengan 403 Forbidden
  if (!allowed) return new NextResponse("Origin not allowed", { status: 403 });

  const headers = corsHeaders(origin);

  // Request "preflight" OPTIONS (dikirim browser otomatis sebelum request asli)
  // -> cukup balas 204 tanpa isi beserta header CORS
  if (request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers });

  // Untuk request biasa: lanjutkan ke API dan tempelkan header CORS di responsenya
  const response = NextResponse.next();
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

// Middleware ini hanya berlaku untuk URL yang diawali /api/
export const config = { matcher: "/api/:path*" };
