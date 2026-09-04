// ============================================================================
// FILE: src/app/layout.tsx
// FUNGSI: Kerangka HTML dasar yang membungkus SEMUA halaman.
//         Mirip file "header.php + footer.php" yang selalu di-include.
// Di sinilah font, judul tab browser (<title>), dan CSS global dimuat.
// ============================================================================

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Memuat font Geist dari Google Fonts, disimpan sebagai variabel CSS
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Metadata = isi <head> HTML: judul tab & deskripsi (untuk SEO)
export const metadata: Metadata = {
  title: "MyNotes - Catatan Pribadi",
  description: "Catatan pribadi yang aman dan tersinkron.",
};

// { children } = konten halaman yang dibungkus layout ini (isi page.tsx)
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
