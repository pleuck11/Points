// src/app/claim/ClaimPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

type Status =
  | "checking"
  | "need-login"
  | "invalid-link"
  | "not-found"
  | "ready"
  | "already-used"
  | "success"
  | "error";

const MAX_STAMPS = 10;

export default function ClaimPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("need-login");
        return;
      }

      const idFromUrl = searchParams.get("id")?.trim() || "";
      const pinFromUrl = searchParams.get("pin")?.trim() || "";

      if (!idFromUrl && !pinFromUrl) {
        setStatus("invalid-link");
        setMessage("ลิงก์ไม่ถูกต้อง (ไม่มีรหัสคูปอง)");
        return;
      }

      try {
        setStatus("checking");

        let couponRef;
        let couponSnap;

        if (idFromUrl) {
          // กรณีลิงก์แบบเก่า /claim?id=xxxx
          couponRef = doc(db, "qr_codes", idFromUrl);
          couponSnap = await getDoc(couponRef);
        } else {
          // กรณีกรอก PIN: /claim?pin=xxxxxx
          const qrRef = collection(db, "qr_codes");
          const q = query(
            qrRef,
            where("pin", "==", pinFromUrl),
            limit(1),
          );
          const qrSnap = await getDocs(q);
          if (qrSnap.empty) {
            setStatus("not-found");
            setMessage("ไม่พบคูปองจาก PIN นี้");
            return;
          }
          const doc0 = qrSnap.docs[0];
          couponRef = doc(db, "qr_codes", doc0.id);
          couponSnap = doc0;
        }

        if (!couponSnap || !couponSnap.exists()) {
          setStatus("not-found");
          setMessage("ไม่พบคูปองในระบบ");
          return;
        }

        const couponData = couponSnap.data() as any;

        if (couponData.used) {
          setStatus("already-used");
          setMessage("คูปองนี้ถูกใช้ไปแล้ว");
          return;
        }

        // ตรวจสิทธิ์ +ตัดแต้ม +บันทึกประวัติแบบ transaction
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await transaction.get(userRef);

          if (!userSnap.exists()) {
            throw new Error("ไม่พบข้อมูลลูกค้า");
          }

          const userData = userSnap.data() as any;
          const currentStamps = userData.stamps ?? 0;
          const phone = userData.phone ?? "-";

          if (currentStamps < MAX_STAMPS) {
            throw new Error("แต้มยังไม่ครบ 10 แก้ว");
          }

          // ตัดแต้มใน user + เพิ่ม log ใน user (เก็บทุกครั้ง)
          const newHistory = [
            ...(userData.redeemHistory ?? []),
            {
              at: serverTimestamp(),
              detail: "แลกแก้วฟรี 1 แก้ว",
            },
          ];

          transaction.update(userRef, {
            stamps: currentStamps - MAX_STAMPS,
            redeemHistory: newHistory,
          });

          // อัปเดตคูปองว่าถูกใช้แล้ว + เก็บ userId ที่ใช้
          transaction.update(couponRef, {
            used: true,
            usedBy: user.uid,
            usedAt: serverTimestamp(),
            usedPhone: phone,
          });

          // เก็บ log แยกสำหรับหน้า admin usage
          const usageRef = collection(db, "coupon_usages");
          transaction.set(doc(usageRef), {
            userId: user.uid,
            phone,
            couponId: couponRef.id,
            usedAt: serverTimestamp(),
          });
        });

        setStatus("success");
        setMessage("ใช้คูปองสำเร็จ! แต้มถูกตัดและบันทึกประวัติแล้ว");
      } catch (err: any) {
        console.error(err);
        if (err?.message?.includes("แต้มยังไม่ครบ")) {
          setStatus("error");
          setMessage(err.message);
        } else {
          setStatus("error");
          setMessage("เกิดข้อผิดพลาดในการใช้คูปอง");
        }
      }
    });

    return () => unsub();
  }, [searchParams, router]);

  // ------- UI ---------
  const goBack = () => router.replace("/card");

  const renderContent = () => {
    switch (status) {
      case "checking":
        return (
          <>
            <h1 className="text-lg font-semibold mb-2">ใช้คูปองสะสมแต้ม</h1>
            <p className="text-sm text-slate-600">
              กำลังตรวจสอบคูปอง กรุณารอสักครู่...
            </p>
          </>
        );

      case "need-login":
        return (
          <>
            <h1 className="text-lg font-semibold mb-2">ต้องเข้าสู่ระบบก่อน</h1>
            <p className="text-sm text-slate-600 mb-3">
              กรุณาเข้าสู่ระบบในอุปกรณ์ของลูกค้าก่อน จากนั้นลองเปิดลิงก์นี้ใหม่อีกครั้ง
            </p>
            <button
              onClick={() => router.replace("/")}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white text-sm font-medium"
            >
              ไปหน้าเข้าสู่ระบบ
            </button>
          </>
        );

      case "invalid-link":
      case "not-found":
      case "already-used":
      case "error":
        return (
          <>
            <h1 className="text-lg font-semibold mb-2">ใช้คูปองสะสมแต้ม</h1>
            <p className="text-sm text-red-600 mb-3">{message}</p>
            <button
              onClick={goBack}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white text-sm font-medium"
            >
              กลับไปหน้าบัตร
            </button>
          </>
        );

      case "success":
        return (
          <>
            <h1 className="text-lg font-semibold mb-2">ใช้คูปองสำเร็จ 🎉</h1>
            <p className="text-sm text-slate-700 mb-3">{message}</p>
            <button
              onClick={goBack}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-600 text-white text-sm font-medium"
            >
              กลับไปหน้าบัตร
            </button>
          </>
        );

      case "ready":
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 text-center">
        {renderContent()}
      </div>
    </main>
  );
}
