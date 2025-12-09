import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Points Loyalty",
  description: "ระบบสะสมแต้มสำหรับร้านค้า",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
              <p className="text-slate-600">กำลังโหลดหน้า...</p>
            </div>
          }
        >
          {children}
        </Suspense>
      </body>
    </html>
  );
}
