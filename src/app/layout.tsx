// This file is the shared shell for ALL pages. It runs before every page,
// and "children" is whichever page (page.tsx) is currently open.
// We import globals.css here so it applies to every page.
// If we want a shared header/nav later, it goes here.
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

// Runs before first paint so a stored theme preference applies immediately —
// without this, the page would flash the system-default theme (see
// [data-theme] rules in globals.css) before ThemeToggle's own effect (which
// only runs after React hydrates) could correct it.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Foyer",
  description: "Ziyaretçi ve toplantı odası yönetimi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
