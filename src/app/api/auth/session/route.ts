// ============================================================================
// FILE: src/app/api/auth/session/route.ts
// FUNGSI: Endpoint untuk CEK STATUS LOGIN. Alamatnya: GET /notes/api/auth/session
// Dipakai client untuk mengetahui: "apakah saya masih login?"
// Di PHP mirip: echo json_encode(['authenticated' => isset($_SESSION['user'])]);
// ============================================================================

import { isAuthenticated } from "@/lib/auth";
import { response, unauthorized } from "@/lib/http";

export async function GET(request: Request) {
  // Kalau token valid -> { authenticated: true }, kalau tidak -> 401 Unauthorized
  return (await isAuthenticated(request)) ? response({ authenticated: true }) : unauthorized();
}
