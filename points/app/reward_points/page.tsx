// app/reward_points/page.tsx
import { Suspense } from "react";
import RewardPointsClient from "./RewardPointsClient";

export default function RewardPointsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <p className="text-slate-600">กำลังโหลดหน้าแต้มสะสม...</p>
        </div>
      }
    >
      <RewardPointsClient />
    </Suspense>
  );
}
