// ============================================================================
// FILE: src/lib/http.ts
// FUNGSI: Helper kecil untuk membuat respons API yang konsisten.
//
// CATATAN UNTUK PROGRAMMER PHP:
// - "NextResponse.json()" mirip seperti di PHP:
//     header('Content-Type: application/json');
//     http_response_code(401);
//     echo json_encode(['error' => 'Unauthorized']);
// ============================================================================

import { NextResponse } from "next/server";

// Helper untuk respons 401 (belum login / token tidak valid)
export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Helper untuk respons sukses. Semua respons API dibungkus format:
//   { "data": ..., "server_time": "..." }
// "<T>" adalah generic TypeScript — artinya fungsi ini menerima data tipe apa pun.
export const response = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json({ data, server_time: new Date().toISOString() }, init);
