// ============================================================================
// FILE: src/app/api/auth/session/route.ts
// FUNGSI: Endpoint untuk CEK STATUS LOGIN. Alamatnya: GET /notes/api/auth/session
// Dipakai client untuk mengetahui: "apakah saya masih login?"
// Di PHP mirip: echo json_encode(['authenticated' => isset($_SESSION['user'])]);
//
// PERPANJANGAN OTOMATIS (sliding session):
// Setiap kali client memverifikasi sesi dan token-nya masih valid, server
// menerbitkan token BARU dengan masa berlaku penuh dan mengirimkannya
// (header Set-Cookie + field "token" di body).
//   - Browser  : cookie diperbarui otomatis, user tidak perlu login lagi.
//   - Mobile   : aplikasi menyimpan token baru dari body respons.
// Dengan begitu, pemakaian rutin otomatis memperpanjang sesi dan user tidak
// akan tiba-tiba ter-logout hanya karena masa berlaku token habis.
// Kalau token sudah benar-benar kedaluwarsa, endpoint membalas 401 dan
// aplikasi meminta login ulang — setelah itu perpanjangan berjalan lagi.
// ============================================================================

import { NextResponse } from "next/server";
import { COOKIE_NAME, cookieMaxAge, createToken, isAuthenticated } from "@/lib/auth";

export async function GET(request: Request) {
  // Kalau token tidak valid -> 401 Unauthorized
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Token valid -> terbitkan token baru (perpanjang masa berlaku)
  const token = await createToken();

  const response = NextResponse.json({
    data: { authenticated: true, token },
    server_time: new Date().toISOString(),
  });

  // Perbarui cookie (dipakai versi web). Mobile memakai token dari body.
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAge(),
  });

  return response;
}
