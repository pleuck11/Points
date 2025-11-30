"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

type Status = "loading" | "success" | "error";

function ClaimContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<Status>("loading");
  const [title, setTitle] = useState("กำลังตรวจสอบคูปอง...");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      setStatus("error");
      setTitle("ลิงก์ไม่ถูกต้อง (ไม่มีรหัสคูปอง)");
      setDetail("กรุณาสแกน QR ใหม่หรือให้ร้านช่วยตรวจสอบลิงก์");
      return;
    }

    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setStatus("error");
        setTitle("กรุณาเข้าสู่ระบบก่อนใช้คูปอง");
        setDetail("ปิดหน้านี้แล้วเข้าสู่ระบบ จากนั้นลองสแกน QR อีกครั้ง");
        return;
      }

      try {
        setStatus("loading");
        setTitle("กำลังเพิ่มแต้มให้บัตรของคุณ...");

        const qrRef = doc(db, "qr_codes", id);
        const userRef = doc(db, "users", user.uid);

        await runTransaction(db, async (tx) => {
          const qrSnap = await tx.get(qrRef);
          if (!qrSnap.exists()) {
            throw new Error("ไม่พบคูปองนี้ในระบบ");
          }

          const qrData = qrSnap.data() as any;

          if (qrData.used) {
            throw new Error("คูปองนี้ถูกใช้ไปแล้ว");
          }

          const userSnap = await tx.get(userRef);
          if (!userSnap.exists()) {
            throw new Error("ไม่พบบัญชีลูกค้า");
          }

          const userData = userSnap.data() as any;
          const currentStamps = userData.stamps ?? 0;
          const add = qrData.amount ?? 0;

          const newStamps = currentStamps + add;

          // อัปเดตแต้มใน user
          tx.update(userRef, {
            stamps: newStamps,
          });

          // มาร์กว่า QR นี้ถูกใช้แล้ว
          tx.update(qrRef, {
            used: true,
            usedAt: serverTimestamp(),
            usedBy: user.uid,
            usedByPhone: userData.phone ?? "",
          });
        });

        setStatus("success");
        setTitle("เพิ่มแต้มเรียบร้อยแล้ว 🎉");
        setDetail("คุณสามารถกลับไปดูบัตรสะสมแต้มได้จากปุ่มด้านล่าง");
      } catch (err: any) {
        console.error(err);
        setStatus("error");

        const msg = String(err?.message ?? "");
        if (msg.includes("ถูกใช้ไปแล้ว")) {
          setTitle("คูปองนี้ถูกใช้ไปแล้ว");
          setDetail("กรุณาติดต่อร้านเพื่อให้ตรวจสอบประวัติการใช้คูปอง");
        } else {
          setTitle("ไม่สามารถใช้คูปองได้");
          setDetail("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งหรือติดต่อร้านค้า");
        }
      }
    });

    return () => unsub();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-base font-semibold mb-2">ใช้คูปองสะสมแต้ม</h1>

        <p
          className={
            status === "success"
              ? "text-sm text-emerald-700 font-medium"
              : status === "error"
              ? "text-sm text-rose-700 font-medium"
              : "text-sm text-slate-700 font-medium"
          }
        >
          {title}
        </p>

        {detail && (
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            {detail}
          </p>
        )}

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={() => router.replace("/card")}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600
                       text-white text-sm font-medium shadow-md hover:brightness-110
                       active:scale-95 transition-all"
          >
            กลับไปหน้าบัตร
          </button>
        </div>
      </div>
    </main>
  );
}

// *** ตัวที่ export ออกไปเป็นหน้าจริง ***
// ห่อด้วย <Suspense> เพื่อให้ Next พอใจเรื่อง useSearchParams
export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-600">กำลังโหลดข้อมูลคูปอง...</p>
        </main>
      }
    >
      <ClaimContent />
    </Suspense>
  );
}
