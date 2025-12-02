"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

export default function ClaimPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [qrId, setQrId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = searchParams.get("id");
    const pin = searchParams.get("pin")?.trim() || "";

    setStatus("checking");
    setMessage(null);
    setQrId(null);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("need-login");
        setMessage("กรุณาเข้าสู่ระบบก่อนเพื่อใช้คูปองสะสมแต้ม");
        return;
      }

      if (!id && !pin) {
        setStatus("invalid-link");
        setMessage("ลิงก์ไม่ถูกต้อง (ไม่มีรหัสคูปอง)");
        return;
      }

      try {
        let qrSnap: any = null;

        if (id) {
          // เคลมจากลิงก์ที่แนบ id ของเอกสารมา
          const ref = doc(db, "qr_codes", id);
          qrSnap = await getDoc(ref);
          if (!qrSnap.exists()) {
            qrSnap = null;
          }
        } else if (pin) {
          // เคลมจาก PIN → หาเอกสารที่มี pin ตรงกัน
          // ใช้ where แค่ field เดียว จะไม่ต้องสร้าง composite index
          const qrRef = collection(db, "qr_codes");
          const q = query(qrRef, where("pin", "==", pin), limit(1));
          const qs = await getDocs(q);
          if (!qs.empty) {
            qrSnap = qs.docs[0];
          }
        }

        if (!qrSnap) {
          setStatus("not-found");
          setMessage(
            "ไม่พบคูปองจากลิงก์หรือ PIN นี้ กรุณาสแกนใหม่หรือให้ร้านช่วยตรวจสอบ"
          );
          return;
        }

        const data = qrSnap.data() as any;
        setQrId(qrSnap.id);
        setAmount(data.amount ?? 0);

        if (data.used) {
          setStatus("already-used");
          setMessage("คูปองนี้ถูกใช้ไปแล้ว กรุณาขอคูปองใหม่จากทางร้าน");
        } else {
          setStatus("ready");
          setMessage(
            `คูปองนี้ให้แต้มสะสมจำนวน ${data.amount ?? 0} แก้ว กดยืนยันเพื่อรับแต้มเข้าบัตรของคุณ`
          );
        }
      } catch (err) {
        console.error("claim load error", err);
        setStatus("error");
        setMessage("เกิดข้อผิดพลาดในการโหลดข้อมูลคูปอง กรุณาลองใหม่อีกครั้ง");
      }
    });

    return () => unsub();
  }, [searchParams]);

  const handleConfirm = async () => {
    const user = auth.currentUser;
    if (!user || !qrId || submitting) return;

    setSubmitting(true);
    setMessage(null);

    try {
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", user.uid);
        const qrRef = doc(db, "qr_codes", qrId);

        const [userSnap, qrSnap] = await Promise.all([
          tx.get(userRef),
          tx.get(qrRef),
        ]);

        if (!qrSnap.exists()) {
          throw new Error("QR_NOT_FOUND");
        }

        const qrData = qrSnap.data() as any;
        if (qrData.used) {
          throw new Error("QR_ALREADY_USED");
        }

        const userData = (userSnap.data() as any) || {};
        const currentStamps = userData.stamps ?? 0;
        const newStamps = currentStamps + (qrData.amount ?? 0);

        // อัปเดตแต้มของลูกค้า
        tx.set(
          userRef,
          {
            stamps: newStamps,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // มาร์กว่าคูปองนี้ถูกใช้แล้ว
        tx.update(qrRef, {
          used: true,
          usedBy: user.uid,
          usedAt: serverTimestamp(),
        });
      });

      setStatus("success");
      setMessage(
        `รับแต้มสะสมสำเร็จ (+${amount} แก้ว) แต้มใหม่จะอัปเดตบนบัตรสะสมของคุณ`
      );
    } catch (err: any) {
      console.error("claim confirm error", err);
      if (err?.message === "QR_ALREADY_USED") {
        setStatus("already-used");
        setMessage("คูปองนี้ถูกใช้ไปแล้ว กรุณาขอคูปองใหม่จากทางร้าน");
      } else if (err?.message === "QR_NOT_FOUND") {
        setStatus("not-found");
        setMessage("ไม่พบคูปองนี้ในระบบ กรุณาสแกนใหม่หรือให้ร้านช่วยตรวจสอบ");
      } else {
        setStatus("error");
        setMessage("เกิดข้อผิดพลาดในการใช้คูปอง กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goToCard = () => {
    router.push("/card");
  };

  // ---------- UI ----------
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow p-6">
        <h1 className="text-lg font-semibold mb-4 text-center">
          ใช้คูปองสะสมแต้ม
        </h1>

        {status === "checking" && (
          <p className="text-sm text-slate-600 text-center">
            กำลังตรวจสอบคูปองของคุณ...
          </p>
        )}

        {status !== "checking" && (
          <>
            {message && (
              <p className="text-sm text-center mb-4 text-slate-700">
                {message}
              </p>
            )}

            {status === "ready" && (
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="text-3xl">🥤</div>
                <p className="text-sm text-slate-700">
                  คุณจะได้รับแต้มสะสม{" "}
                  <span className="font-semibold">{amount}</span> แก้ว
                </p>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="mt-2 px-5 py-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white text-sm font-medium shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
                >
                  {submitting ? "กำลังบันทึก..." : "ยืนยันรับแต้ม"}
                </button>
              </div>
            )}

            {status === "need-login" && (
              <p className="text-sm text-center text-slate-700">
                กรุณาเข้าสู่ระบบจากหน้าบัตรสะสมแต้ม แล้วสแกน / กรอกรหัสใหม่อีกครั้ง
              </p>
            )}

            {(status === "invalid-link" ||
              status === "not-found" ||
              status === "already-used" ||
              status === "error" ||
              status === "success") && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={goToCard}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white text-sm font-medium shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  กลับไปหน้าบัตร
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
