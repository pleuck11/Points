// src/app/card/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { QrReader } from "react-qr-reader";

const MAX_STAMPS = 10;

type RedeemItem = {
  freeCups: number;
  usedAt: Date | null;
};

export default function CardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [stamps, setStamps] = useState(0);
  const [phone, setPhone] = useState("");
  const [redeemHistory, setRedeemHistory] = useState<RedeemItem[]>([]);

  // สแกน QR
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // กรอกรหัส PIN
  const [pinOpen, setPinOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // โหลดข้อมูล user แบบ realtime
  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        router.replace("/");
        return;
      }

      setUserId(user.uid);

      const ref = doc(db, "users", user.uid);
      unsubUser = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as any;
            setStamps(data.stamps ?? 0);
            setPhone(data.phone ?? "");

            const rawHistory = (data.redeemHistory ?? []) as any[];
            const mapped: RedeemItem[] = rawHistory.map((h) => ({
              freeCups: h.freeCups ?? 1,
              usedAt: h.usedAt?.toDate
                ? h.usedAt.toDate()
                : h.usedAt instanceof Date
                ? h.usedAt
                : null,
            }));
            setRedeemHistory(
              mapped.sort((a, b) => {
                const ta = a.usedAt?.getTime() ?? 0;
                const tb = b.usedAt?.getTime() ?? 0;
                return tb - ta; // ใหม่อยู่บน
              })
            );
          }
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
    };
  }, [router]);

  // ใช้สิทธิ์ฟรี 1 แก้ว
  const handleUseReward = async () => {
    if (!userId) return;

    if (stamps < MAX_STAMPS) {
      alert("แต้มยังไม่ครบ 10 แก้ว ไม่สามารถใช้สิทธิ์ได้");
      return;
    }

    const confirmUse = window.confirm(
      "ต้องการใช้สิทธิ์แลกแก้วฟรี 1 แก้ว และรีเซ็ตแต้มกลับไปเริ่มนับใหม่หรือไม่?"
    );
    if (!confirmUse) return;

    try {
      const userRef = doc(db, "users", userId);

      const historyItem = {
        freeCups: 1,
        usedAt: new Date(), // ใช้ Date ปกติได้ใน arrayUnion
      };

      // อัปเดตแต้ม + ประวัติใน user
      await updateDoc(userRef, {
        stamps: stamps - MAX_STAMPS,
        redeemHistory: arrayUnion(historyItem),
      });

      // บันทึกลง collection กลางสำหรับ admin ดูรวมทุกคน
      await addDoc(collection(db, "coupon_uses"), {
        userId,
        phone,
        freeCups: 1,
        usedAt: serverTimestamp(),
      });

      alert("ใช้สิทธิ์แลกแก้วฟรี 1 แก้วเรียบร้อยแล้ว");
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการใช้สิทธิ์ กรุณาลองใหม่อีกครั้ง");
    }
  };

  // คัดการเมื่อ submit PIN
  const handleSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinInput.trim();
    if (!pin) {
      setPinError("กรุณากรอกรหัสคูปอง");
      return;
    }
    setPinError(null);

    // เด้งไปหน้า claim ให้จัดการเพิ่มแต้มเหมือนสแกน QR
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${base}/claim?pin=${encodeURIComponent(pin)}`;
    window.location.href = url;
  };

  // utility แปลงวันที่
  const formatThaiDateTime = (d: Date | null) => {
    if (!d) return "-";
    return d.toLocaleString("th-TH", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 text-sm">กำลังโหลดบัตรสะสมแต้ม...</p>
      </main>
    );
  }

  const gradientBtn =
    "px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 " +
    "text-white text-sm font-medium shadow-md hover:brightness-110 " +
    "active:scale-95 transition-all";

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      {/* HEADER */}
      <header className="w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 border-b border-slate-300 bg-slate-50">
        <span className="font-semibold text-sm sm:text-base">
          บัตรสะสมแต้มร้าน Points Café
        </span>

        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => {
              setScanOpen(true);
              setScanMessage(null);
            }}
            className={gradientBtn}
          >
            สแกนรับแต้ม
          </button>

          <button
            onClick={() => {
              setPinOpen(true);
              setPinInput("");
              setPinError(null);
            }}
            className={gradientBtn}
          >
            กรอกรหัสรับแต้ม
          </button>

          <button
            onClick={async () => {
              await signOut(auth);
              router.replace("/");
            }}
            className={gradientBtn}
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* CARD */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6">
        <div className="w-full max-w-xl">
          <div className="w-full rounded-2xl shadow-lg p-4 sm:p-5 bg-[#b29b86] text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-lime-500 flex items-center justify-center text-[10px] font-bold">
                  CAFE
                </div>
                <div>
                  <p className="text-sm font-semibold">Points Café</p>
                  {phone && (
                    <p className="text-[11px] text-white/80">
                      ลูกค้า: {phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-white/70">
                บัตรสะสมแต้ม {MAX_STAMPS} ฟรี 1
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

              <button
                onClick={handleUseReward}
                className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold tracking-wide hover:bg-white/10 active:scale-95 transition"
              >
                ใช้
              </button>
            </div>

            <p className="text-[11px] text-white/85">
              สะสมครบ {MAX_STAMPS} แก้ว รับฟรี 1 แก้ว 🎁
              <br />
              ตอนนี้สะสมแล้ว {stamps} / {MAX_STAMPS} แก้ว
            </p>
          </div>

          {/* ประวัติการใช้สิทธิ์ */}
          <div className="mt-4 bg-white rounded-2xl shadow p-4">
            <h3 className="text-sm font-semibold mb-2">
              ประวัติการใช้สิทธิ์
            </h3>

            {redeemHistory.length === 0 ? (
              <p className="text-xs text-slate-500">
                ยังไม่เคยใช้สิทธิ์แลกแก้วฟรี
              </p>
            ) : (
              <ul className="space-y-1 text-xs text-slate-700">
                {redeemHistory.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between border-b last:border-b-0 border-slate-100 py-1"
                  >
                    <span>แลกแก้วฟรี {item.freeCups} แก้ว</span>
                    <span className="text-slate-500">
                      {formatThaiDateTime(item.usedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* POPUP: สแกน QR */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm">
            <p className="text-sm font-semibold mb-2">
              สแกน QR เพื่อรับแต้ม
            </p>

            <div className="rounded-xl overflow-hidden mb-3 bg-black/5">
              <QrReader
                constraints={{ facingMode: "environment" }}
                onResult={(result, error) => {
                  if (result) {
                    // รองรับทั้ง .getText() และ .text
                    const anyResult = result as any;
                    const text =
                      (anyResult.getText && anyResult.getText()) ||
                      anyResult.text ||
                      "";
                    if (text) {
                      setScanMessage("กำลังพาไปหน้ารับแต้ม...");
                      window.location.href = text;
                    }
                  }
                  if (error) {
                    // error บางแบบจะเด้งบ่อย ไม่ต้อง log ทุกครั้ง
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

      {/* POPUP: กรอกรหัสรับแต้ม */}
      {pinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm">
            <p className="text-sm font-semibold mb-3">กรอกรหัสคูปอง</p>

            <form onSubmit={handleSubmitPin} className="space-y-3">
              <input
                type="text"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="เช่น 123456"
              />
              {pinError && (
                <p className="text-xs text-red-500">{pinError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-md bg-gradient-to-r from-sky-400 to-blue-600 text-white text-sm font-medium shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  ยืนยัน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinOpen(false);
                    setPinError(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-md bg-slate-200 text-slate-800 text-sm"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
