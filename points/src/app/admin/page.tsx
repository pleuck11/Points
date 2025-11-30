// src/app/admin/page.tsx
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
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import QRCode from "react-qr-code";

type QrItem = {
  id: string;
  amount: number;
  createdAt: Date | null;
  pin?: string;
  used: boolean;
  usedAt: Date | null;
  usedByPhone?: string;
};

const formatDateTime = (d: Date | null) => {
  if (!d) return "-";
  return d.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number>(1);
  const [origin, setOrigin] = useState<string>("");

  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [history, setHistory] = useState<QrItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // เลือกวันที่จากปฏิทิน (รูปแบบ yyyy-mm-dd)
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    let unsubQr: (() => void) | null = null;

    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        router.replace("/");
        return;
      }

      setLoading(true);
      try {
        // เช็กสิทธิ์ admin
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const data = (userSnap.data() as any) || {};
        const isAdmin = data?.isAdmin === true;
        if (!isAdmin) {
          setLoading(false);
          router.replace("/card");
          return;
        }

        // subscribe ประวัติ qr ของแอดมินคนนี้ (ดึงมาทีเดียว ~200 รายการ)
        const qrRef = collection(db, "qr_codes");
        const q = query(
          qrRef,
          where("createdBy", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(200)
        );

        if (unsubQr) unsubQr();
        unsubQr = onSnapshot(
          q,
          (snap) => {
            const items: QrItem[] = [];
            snap.forEach((docSnap) => {
              const d = docSnap.data() as any;
              items.push({
                id: docSnap.id,
                amount: d.amount ?? 0,
                pin: d.pin,
                createdAt: d.createdAt?.toDate
                  ? d.createdAt.toDate()
                  : null,
                used: d.used === true,
                usedAt: d.usedAt?.toDate ? d.usedAt.toDate() : null,
                usedByPhone: d.usedByPhone ?? undefined,
              });
            });
            setHistory(items);
            setHistoryLoading(false);
          },
          (err) => {
            console.error("qr history error", err);
            setHistoryLoading(false);
          }
        );

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubQr) unsubQr();
    };
  }, [router]);

  const handleGenerate = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setGenerating(true);
    setMessage(null);

    try {
      // สุ่ม PIN 6 หลัก
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      const qrRef = collection(db, "qr_codes");
      const docRef = await addDoc(qrRef, {
        amount,
        pin,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        used: false,
      });

      const base =
        origin ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const url = `${base}/claim?id=${docRef.id}`;

      setCurrentUrl(url);
      setCurrentPin(pin);
      setMessage("สร้าง QR สำเร็จแล้ว ส่งให้ลูกค้าสแกนหรือบอกรหัส PIN ได้เลย");
    } catch (err) {
      console.error(err);
      setMessage("เกิดข้อผิดพลาดในการสร้าง QR กรุณาลองใหม่");
    } finally {
      setGenerating(false);
    }
  };

  // ปุ่มคัดลอก
  const copyText = async (text: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert(`${label}ถูกคัดลอกแล้ว`);
      } else {
        alert(`${label}\n${text}`);
      }
    } catch (e) {
      alert(`คัดลอกไม่สำเร็จ กรุณาคัดลอกเอง\n${label}${text}`);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 text-sm">กำลังโหลดข้อมูลแอดมิน...</p>
      </main>
    );
  }

  const gradientBtn =
    "px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 " +
    "text-white text-sm font-medium shadow-md hover:brightness-110 " +
    "active:scale-95 transition-all";

  const copyBtn =
    "px-3 py-1 rounded-full border border-slate-300 text-[11px] sm:text-xs " +
    "text-slate-700 bg-white hover:bg-slate-50 active:scale-95 transition";

  // filter ตามวันที่ที่เลือก (ถ้าไม่เลือก แสดงทั้งหมด)
  const historyForRender = selectedDate
    ? history.filter((item) => {
        if (!item.createdAt) return false;
        const y = item.createdAt.getFullYear();
        const m = item.createdAt.getMonth() + 1;
        const d = item.createdAt.getDate();
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(
          d
        ).padStart(2, "0")}`;
        return dateStr === selectedDate;
      })
    : history;

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      {/* HEADER */}
      <header className="w-full bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-semibold text-sm sm:text-base">
            Admin Dashboard · Points Café
          </h1>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/card")}
              className={gradientBtn}
            >
              หน้าบัตรลูกค้า
            </button>
            <button
              onClick={async () => {
                await signOut(auth);
                router.replace("/");
              }}
              className={gradientBtn}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 px-4 sm:px-6 py-6 flex flex-col items-center gap-4">
        {/* การ์ดสร้าง QR */}
        <section className="w-full max-w-xl bg-white rounded-2xl shadow p-4 sm:p-6">
          <h2 className="text-base font-semibold mb-4">
            สร้าง QR สะสมแต้ม
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">จำนวนแก้ว:</span>
              <select
                className="border rounded-md px-2 py-1 text-sm"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 1)}
              >
                {Array.from({ length: 10 }).map((_, i) => {
                  const v = i + 1;
                  return (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  );
                })}
              </select>
              <span className="text-sm text-slate-700">แก้ว</span>
            </div>

            <div className="flex gap-2 sm:ml-auto">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={gradientBtn}
              >
                {generating ? "กำลังสร้าง..." : "สร้าง QR Code"}
              </button>

              <button
                onClick={() => router.push("/admin/usage")}
                className={gradientBtn}
              >
                ดูการใช้งานคูปอง
              </button>
            </div>
          </div>

          {/* แสดง QR & PIN ปัจจุบัน */}
          {currentUrl && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-xl shadow-inner">
                <QRCode value={currentUrl} size={180} />
              </div>

              {currentPin && (
                <p className="text-sm font-medium text-slate-800 text-center">
                  PIN สำหรับลูกค้าที่ไม่สะดวกสแกน:{" "}
                  <span className="font-mono text-lg tracking-[0.3em]">
                    {currentPin}
                  </span>
                </p>
              )}

              <p className="text-xs text-slate-600 text-center break-all">
                ลูกค้าสแกนลิงก์นี้เพื่อรับแต้ม:
                <br />
                {currentUrl}
              </p>

              <div className="flex flex-wrap gap-2 justify-center">
                {currentPin && (
                  <button
                    className={copyBtn}
                    onClick={() =>
                      copyText(currentPin, "PIN สำหรับลูกค้า ")
                    }
                  >
                    คัดลอก PIN
                  </button>
                )}
                <button
                  className={copyBtn}
                  onClick={() =>
                    copyText(currentUrl, "ลิงก์สำหรับรับแต้ม ")
                  }
                >
                  คัดลอกลิงก์
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className="mt-4 text-xs text-slate-600">{message}</p>
          )}
        </section>

        {/* การ์ดประวัติ */}
        <section className="w-full max-w-xl bg-white rounded-2xl shadow p-4 sm:p-6">
          <h2 className="text-base font-semibold mb-3">
            ประวัติการสร้าง QR Code ล่าสุด
          </h2>

          {/* ปฏิทินเลือกวัน */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-slate-600">
                เลือกวันที่:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-md px-2 py-1 text-xs sm:text-sm"
              />
            </div>
            {selectedDate && (
              <button
                className="text-xs text-sky-600 underline sm:ml-2"
                onClick={() => setSelectedDate("")}
              >
                ล้างวันที่ / แสดงทั้งหมด
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mb-3">
            {selectedDate
              ? `แสดงเฉพาะ QR ที่สร้างวันที่ ${selectedDate} (รวม ${historyForRender.length} รายการ)`
              : `แสดงประวัติ QR ล่าสุดทั้งหมด (สูงสุด ${history.length} รายการที่โหลดมา)`}
          </p>

          {historyLoading ? (
            <p className="text-xs text-slate-500">กำลังโหลดประวัติ...</p>
          ) : historyForRender.length === 0 ? (
            <p className="text-xs text-slate-500">
              ยังไม่มีรายการในวันที่เลือก
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {historyForRender.map((item) => {
                const base =
                  origin ||
                  (typeof window !== "undefined"
                    ? window.location.origin
                    : "");
                const url = `${base}/claim?id=${item.id}`;

                return (
                  <li
                    key={item.id}
                    className="border border-slate-100 rounded-xl px-3 py-2 flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-800">
                        สร้าง QR {item.amount} แก้ว
                      </span>
                      <span className="text-slate-500">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>

                    {item.pin && (
                      <p className="text-slate-700">
                        PIN:{" "}
                        <span className="font-mono tracking-[0.3em]">
                          {item.pin}
                        </span>
                      </p>
                    )}

                    {/* สถานะการใช้งาน */}
                    {item.used ? (
                      <p className="text-[11px] text-emerald-600">
                        สถานะ: ใช้แล้ว{" "}
                        {item.usedAt && `เมื่อ ${formatDateTime(item.usedAt)}`}{" "}
                        {item.usedByPhone &&
                          `(ลูกค้า: ${item.usedByPhone})`}
                      </p>
                    ) : (
                      <p className="text-[11px] text-orange-500">
                        สถานะ: ยังไม่ถูกใช้
                      </p>
                    )}

                    <p className="text-[11px] text-slate-500 break-all">
                      ลิงก์สำหรับรับแต้ม: {url}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-1">
                      {item.pin && (
                        <button
                          className={copyBtn}
                          onClick={() =>
                            copyText(item.pin!, "PIN สำหรับลูกค้า ")
                          }
                        >
                          คัดลอก PIN
                        </button>
                      )}
                      <button
                        className={copyBtn}
                        onClick={() =>
                          copyText(url, "ลิงก์สำหรับรับแต้ม ")
                        }
                      >
                        คัดลอกลิงก์
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
