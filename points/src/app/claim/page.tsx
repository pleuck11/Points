// src/app/claim/page.tsx
import { Suspense } from "react";
import ClaimPageClient from "./ClaimPageClient";

export default function ClaimPage() {
  // ตรงนี้ห้ามมี "use client"
  // และห้าม import/useSearchParams ในไฟล์นี้โดยเด็ดขาด

  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 text-sm">กำลังตรวจสอบคูปอง...</p>
      </main>
    }>
      <ClaimPageClient />
    </Suspense>
  );
}
