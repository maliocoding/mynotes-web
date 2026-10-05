// ============================================================================
// FILE: src/app/api/auth/pin/route.ts
// FUNGSI: Mengganti PIN verifikasi aplikasi.
//         POST /notes/api/auth/pin
//         Body: { pin_lama, pin_baru, konfirmasi_pin }
//
// PIN ini dipakai sebagai lapisan verifikasi saat mengganti password.
// PIN awal = DEFAULT_PIN (lihat src/lib/settings.ts) dan sebaiknya diganti.
// ============================================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { unauthorized } from "@/lib/http";
import { checkRateLimit, clearFailures, recordFailure } from "@/lib/rate-limit";
import { verifyPin } from "@/lib/pin";
import { getOrInitPinHash, updatePin } from "@/lib/settings";

const bodySchema = z
  .object({
    pin_lama: z.string().regex(/^\d{4,6}$/, "PIN lama harus 4-6 digit angka"),
    pin_baru: z.string().regex(/^\d{4,6}$/, "PIN baru harus 4-6 digit angka"),
    konfirmasi_pin: z.string().regex(/^\d{4,6}$/, "Konfirmasi PIN harus 4-6 digit angka"),
  })
  .strict();

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) return unauthorized();

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    "local";

  const limit = checkRateLimit(`pinapp:${ip}`);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    recordFailure(`pinapp:${ip}`);
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 }
    );
  }

  const { pin_lama, pin_baru, konfirmasi_pin } = parsed.data;

  // Verifikasi PIN lama
  const currentHash = await getOrInitPinHash();
  if (!currentHash) {
    // PIN belum pernah dikonfigurasi: izinkan pemasangan PIN pertama kali
    // supaya admin bisa langsung mengamankan server tanpa lewat database.
    if (pin_baru !== konfirmasi_pin)
      return NextResponse.json({ error: "Konfirmasi PIN tidak sama." }, { status: 400 });
    try {
      await updatePin(pin_baru);
    } catch {
      return NextResponse.json({ error: "Gagal menyimpan PIN baru." }, { status: 500 });
    }
    clearFailures(`pinapp:${ip}`);
    return NextResponse.json({ data: { changed: true, initialized: true } });
  }

  if (!verifyPin(pin_lama, currentHash)) {
    recordFailure(`pinapp:${ip}`);
    return NextResponse.json({ error: "PIN lama salah." }, { status: 401 });
  }

  if (pin_baru !== konfirmasi_pin)
    return NextResponse.json({ error: "Konfirmasi PIN tidak sama." }, { status: 400 });

  if (pin_lama === pin_baru)
    return NextResponse.json(
      { error: "PIN baru tidak boleh sama dengan PIN lama." },
      { status: 400 }
    );

  try {
    await updatePin(pin_baru);
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan PIN baru." }, { status: 500 });
  }

  clearFailures(`pinapp:${ip}`);
  return NextResponse.json({ data: { changed: true } });
}
