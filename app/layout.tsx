import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { DemoProvider } from "@/lib/demo-context";

export const metadata: Metadata = {
  title: "Points — ระบบสะสมแต้มและสแตมป์การ์ด",
  description: "ระบบสะสมแต้ม สแตมป์การ์ดดิจิทัล และแลกของรางวัลสำหรับร้านกาแฟและร้านค้า พร้อมโหมดทดลองใช้งาน (Interactive Demo)",
  keywords: ["loyalty points", "สะสมแต้ม", "สแตมป์การ์ด", "ร้านกาแฟ", "ระบบร้านค้า", "demo"],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased selection:bg-amber-500/30 selection:text-amber-200 min-h-screen bg-[#090d16] text-slate-100">
        <DemoProvider>
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-[#090d16]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  <p className="text-xs text-slate-500">กำลังโหลด...</p>
                </div>
              </div>
            }
          >
            {children}
          </Suspense>
        </DemoProvider>
      </body>
    </html>
  );
}
