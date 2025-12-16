"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pin = searchParams.get("pin");
  const points = Number(searchParams.get("points") || 0);

  const [status, setStatus] = useState("กำลังตรวจสอบ...");
  const [user, setUser] = useState<any>(null);

  // ตรวจสอบ login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, [router]);

  // รับแต้ม
  useEffect(() => {
    if (!user || !pin || !points) return;

    const run = async () => {
      try {
        const pinRef = doc(db, "pins", pin);
        const pinSnap = await getDoc(pinRef);

        if (!pinSnap.exists()) {
          setStatus("❌ PIN ไม่ถูกต้องหรือหมดอายุ");
          return;
        }

        const pinData = pinSnap.data();
        if (pinData.used) {
          setStatus("⚠️ PIN นี้ถูกใช้ไปแล้ว");
          return;
        }

        // เพิ่มแต้ม
        await updateDoc(doc(db, "users", user.uid), {
          points: increment(points),
        });

        // mark pin used
        await updateDoc(pinRef, {
          used: true,
          usedBy: user.uid,
          usedAt: new Date(),
        });

        setStatus(`✅ รับ ${points} แต้มสำเร็จ`);
        setTimeout(() => router.push("/reward_points"), 2000);
      } catch (err) {
        console.error(err);
        setStatus("เกิดข้อผิดพลาด");
      }
    };

    run();
  }, [user, pin, points, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 p-8 text-center max-w-sm w-full">
        <h1 className="text-xl font-semibold mb-3">กำลังรับแต้ม</h1>
        <p className="text-slate-200">{status}</p>
      </div>
    </main>
  );
}
