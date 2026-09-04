// ============================================================================
// FILE: src/app/api/auth/logout/route.ts
// FUNGSI: Endpoint untuk LOGOUT. Alamatnya: POST /notes/api/auth/logout
// Caranya: hapus cookie sesi dengan mengatur maxAge = 0.
// Di PHP mirip: setcookie('mynotes_session', '', time() - 3600);
// ============================================================================

import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ data: true });
  // Kosongkan isi cookie dan buat langsung kedaluwarsa (maxAge: 0)
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
