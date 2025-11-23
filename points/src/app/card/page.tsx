"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { QrReader } from "react-qr-reader";

const MAX_STAMPS = 10;

export default function CardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stamps, setStamps] = useState(0);
  const [phone, setPhone] = useState("");

  const [scanOpen, setScanOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    // ฟัง auth + subscribe ข้อมูล user แบบ realtime
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const unsubUser = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as any;
            setStamps(data.stamps ?? 0);
            setPhone(data.phone ?? "");
          }
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
        }
      );

      // cleanup user snapshot เวลา auth เปลี่ยน
      return () => unsubUser();
    });

    return () => {
      unsubAuth();
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 text-sm">กำลังโหลดบัตรสะสมแต้ม...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      {/* แถบบนสุด */}
      <header className="w-full flex items-center justify-between px-6 py-3 border-b border-slate-300 bg-slate-50">
        <span className="font-semibold text-sm">
          บัตรสะสมแต้มร้าน Points Café
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setScanOpen(true);
              setScanMessage(null);
            }}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600
                       text-white text-sm font-medium shadow-md hover:brightness-110
                       active:scale-95 transition-all"
          >
            สแกนรับแต้ม
          </button>

          <button
            onClick={async () => {
              await signOut(auth);
              router.replace("/");
            }}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600
                       text-white text-sm font-medium shadow-md hover:brightness-110
                       active:scale-95 transition-all"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* การ์ดสะสมแต้ม */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl shadow-lg p-4 bg-[#b29b86] text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-lime-500 flex items-center justify-center text-[10px] font-bold">
                CAFE
              </div>
              <div>
                <p className="text-sm font-semibold">Points Café</p>
                {phone && (
                  <p className="text-[11px] text-white/80">ลูกค้า: {phone}</p>
                )}
              </div>
            </div>

            <div className="text-[11px] text-white/70">
              บัตรสะสมแต้ม 10 ฟรี 1
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: MAX_STAMPS }).map((_, i) => {
                const isFilled = i < stamps;
                return (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white ${
                      isFilled ? "opacity-100" : "opacity-30"
                    }`}
                  >
                    <span className="select-none">🥤</span>
                  </div>
                );
              })}
            </div>

            <div className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold tracking-wide">
              GOAL
            </div>
          </div>

          <p className="text-[11px] text-white/85">
            สะสมครบ {MAX_STAMPS} แก้ว รับฟรี 1 แก้ว 🎁
            <br />
            ตอนนี้สะสมแล้ว {stamps} / {MAX_STAMPS} แก้ว
          </p>
        </div>
      </div>

      {/* Popup สแกน QR */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm">
            <p className="text-sm font-semibold mb-2">สแกน QR เพื่อรับแต้ม</p>

            <div className="rounded-xl overflow-hidden mb-3">
              <QrReader
                constraints={{ facingMode: "environment" }}
                onResult={(result, error) => {
                  if (result) {
                    const text = result.getText();
                    if (text) {
                      setScanMessage("กำลังพาไปหน้ารับแต้ม...");
                      window.location.href = text;
                    }
                  }
                  if (error) {
                    if (
                      error.name === "NotAllowedError" ||
                      error.name === "NotFoundError" ||
                      error.name === "NotReadableError"
                    ) {
                      setScanMessage(
                        "ไม่สามารถใช้กล้องได้ กรุณาเปิดผ่าน https หรือใช้กล้องมือถือสแกน QR ปกติ"
                      );
                    }
                  }
                }}
                containerStyle={{ width: "100%" }}
                videoStyle={{ width: "100%" }}
              />
            </div>

            {scanMessage && (
              <p className="text-xs text-slate-600 mb-2">{scanMessage}</p>
            )}

            <button
              onClick={() => {
                setScanOpen(false);
                setScanMessage(null);
              }}
              className="w-full px-4 py-2 rounded-md bg-slate-200 text-slate-800 text-sm"
            >
              ปิดกล้อง
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
