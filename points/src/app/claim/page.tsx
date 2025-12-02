// src/app/claim/page.tsx
import { Suspense } from "react";
import ClaimPageClient from "./ClaimPageClient";

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow p-6">
            <p className="text-sm text-slate-600 text-center">
              กำลังโหลดหน้าสำหรับใช้คูปอง...
            </p>
          </div>
        </main>
      }
    >
      <ClaimPageClient />
    </Suspense>
  );
}
