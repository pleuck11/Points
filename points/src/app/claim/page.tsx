"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";

type ClaimPageProps = {
  searchParams: {
    id?: string;
  };
};

export default function ClaimPage({ searchParams }: ClaimPageProps) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "loading" | "success" | "not_found" | "used" | "error" | "no_id"
  >("loading");

  useEffect(() => {
    const codeId = searchParams.id;
    if (!codeId) {
      setStatus("no_id");
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // ถ้าไม่ล็อกอินให้ส่งกลับหน้าแรกไปล็อกอินก่อน
        router.replace("/");
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

        const amount: number = qrData.amount ?? 0;

        // ทำเครื่องหมายว่า QR นี้ถูกใช้แล้ว
        await updateDoc(qrRef, {
          used: true,
          usedBy: user.uid,
          usedAt: serverTimestamp(),
        });

        // เพิ่มแต้มให้ user
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          stamps: increment(amount),
        });

        setStatus("success");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    });

    return () => unsub();
  }, [router, searchParams.id]);

  const goToCard = () => router.push("/card");

  let message: string;
  switch (status) {
    case "loading":
      message = "กำลังตรวจสอบคูปอง...";
      break;
    case "success":
      message = "เพิ่มแต้มเรียบร้อยแล้ว 🎉";
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
        <p className="text-sm text-slate-800 mb-4">{message}</p>

        {status !== "loading" && (
          <button
            onClick={goToCard}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
          >
            ไปหน้าบัตรสะสมแต้ม
          </button>
        )}
      </div>
    </main>
  );
}
