// Bu dosya TÜM sayfaların ortak kalıbı. Her sayfa açıldığında önce bu çalışır,
// içine gelen "children" o an açık olan sayfa (page.tsx) oluyor.
// globals.css'i buradan import ediyoruz ki tüm sayfalarda geçerli olsun.
// Ortak header/menü gibi bir şey eklemek istersek buraya koyacağız.
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ziyaretçi Yönetim Sistemi",
  description: "Uzser için ziyaretçi yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
