"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";

export default function ClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // 👈 ใช้อ่าน query จาก URL

  const [status, setStatus] = useState<
    "loading" | "success" | "not_found" | "used" | "error" | "no_id"
  >("loading");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    const codeId = searchParams.get("id"); // 👈 ดึงค่าจาก ?id=...

    if (!codeId) {
      setStatus("no_id");
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/"); // ให้ไปล็อกอินก่อน
        return;
      }

      try {
        const qrRef = doc(db, "qr_codes", codeId);
        const qrSnap = await getDoc(qrRef);

        if (!qrSnap.exists()) {
          setStatus("not_found");
          return;
        }

        const qrData = qrSnap.data() as any;

        if (qrData.used) {
          setStatus("used");
          return;
        }

        const amt: number = qrData.amount ?? 0;
        setAmount(amt);

        // mark ว่าใช้แล้ว
        await updateDoc(qrRef, {
          used: true,
          usedBy: user.uid,
          usedAt: serverTimestamp(),
        });

        // เพิ่มแต้มให้ user
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          stamps: increment(amt),
        });

        setStatus("success");

        // เด้งกลับไปหน้าบัตรหลังจากนี้หน่อยนึง
        setTimeout(() => {
          router.replace("/card");
        }, 1500);
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    });

    return () => unsub();
  }, [router, searchParams]);

  let message: string;
  switch (status) {
    case "loading":
      message = "กำลังตรวจสอบคูปอง...";
      break;
    case "success":
      message = amount
        ? `เพิ่มแต้มสำเร็จ +${amount} แก้ว 🎉`
        : "เพิ่มแต้มสำเร็จ 🎉";
      break;
    case "not_found":
      message = "ไม่พบคูปองนี้ หรืออาจถูกลบไปแล้ว";
      break;
    case "used":
      message = "คูปองนี้ถูกใช้ไปแล้ว";
      break;
    case "no_id":
      message = "ลิงก์ไม่ถูกต้อง (ไม่มีรหัสคูปอง)";
      break;
    default:
      message = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-xl shadow p-6 max-w-sm text-center">
        <p className="text-sm text-slate-800 mb-2">{message}</p>
        {status === "success" && (
          <p className="text-xs text-slate-500">
            กำลังกลับไปที่หน้าบัตรสะสมแต้ม...
          </p>
        )}
      </div>
    </main>
  );
}
