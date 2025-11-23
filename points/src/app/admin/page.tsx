"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import QRCode from "react-qr-code";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [amount, setAmount] = useState(1); // จำนวนแก้วที่จะให้
  const [qrId, setQrId] = useState<string | null>(null);
  const [origin, setOrigin] = useState(""); // base URL เช่น http://localhost:3000

  useEffect(() => {
    // ได้ origin จาก browser (ตอนรันฝั่ง client เท่านั้น)
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // ตรวจสอบสิทธิ์ admin จาก field isAdmin ใน users/<uid>
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data.isAdmin === true) {
            setIsAdmin(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleCreateQr = async () => {
    try {
      const amt = Math.max(1, Math.min(10, amount)); // จำกัด 1–10 แก้ว

      const ref = await addDoc(collection(db, "qr_codes"), {
        amount: amt,
        used: false,
        createdAt: serverTimestamp(),
      });

      setQrId(ref.id);
      setAmount(amt);
    } catch (err) {
      console.error(err);
      alert("สร้าง QR ไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 text-sm">กำลังโหลดหลังบ้าน...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-xl shadow p-6 max-w-sm text-center">
          <p className="text-sm text-slate-700 mb-3">
            คุณไม่มีสิทธิ์เข้าใช้งานหน้านี้
          </p>
          <button
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
            onClick={() => router.push("/")}
          >
            กลับหน้าแรก
          </button>
        </div>
      </main>
    );
  }

  const claimUrl =
    qrId && origin ? `${origin}/claim?id=${qrId}` : "สร้าง QR ก่อน";

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      {/* แถบบนสุด */}
      <header className="w-full flex items-center justify-between px-6 py-3 border-b border-slate-300 bg-white">
        <span className="font-semibold text-sm">Admin Dashboard - Points Café</span>

        <div className="flex items-center gap-2">
          {/* ปุ่มไปหน้าบัตรลูกค้า */}
          <button
            onClick={() => router.push("/card")}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600
                      text-white text-sm font-medium shadow-md hover:brightness-110
                      active:scale-95 transition-all"
          >
            หน้าบัตรลูกค้า
          </button>

          {/* ปุ่ม Logout ของ admin */}
          <button
            onClick={async () => {
              await signOut(auth);
              router.replace("/");
            }}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600
                      text-white text-sm font-medium shadow-md hover:brightness-110
                      active:scale-95 transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center py-10">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xl">
          <h1 className="text-lg font-bold mb-4">สร้าง QR สะสมแต้ม</h1>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm">จำนวนแก้ว:</label>
            <input
              type="number"
              min={1}
              max={10}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-20 border border-slate-300 rounded-md px-2 py-1 text-sm"
            />
            <span className="text-sm text-slate-600">แก้ว</span>
          </div>

          <button
            onClick={handleCreateQr}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            สร้าง QR Code
          </button>

          {qrId && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="bg-white p-4 rounded-xl shadow">
                <QRCode value={claimUrl} size={160} />
              </div>
              <p className="text-xs text-slate-600 break-all text-center">
                ลูกค้าสแกนลิงก์นี้เพื่อรับแต้ม:
                <br />
                <span className="font-mono">{claimUrl}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
