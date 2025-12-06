// app/layout.tsx
import type { Metadata, Viewport } from "next";
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

// ข้อมูลทั่วไปของเว็บ
export const metadata: Metadata = {
  title: "Points Loyalty",
  description: "ระบบสะสมแต้มสำหรับลูกค้า",
};

// ให้ viewport รองรับมือถือ (zoom พอดีหน้าจอ)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 text-slate-900`}
      >
        {/* โครงกลางของทุกหน้า */}
        <div className="min-h-screen flex flex-col">
          {/* ถ้าจะมี Header/Footer รวมทุกหน้าค่อยวางเพิ่มตรงนี้ได้ */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
