// src/app/admin/usage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

type UsageItem = {
  id: string;
  userId: string;
  phone: string;
  freeCups: number;
  usedAt: Date | null;
};

const formatDateTime = (d: Date | null) => {
  if (!d) return "-";
  return d.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export default function UsagePage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    // yyyy-MM-dd สำหรับ input type="date"
    return now.toISOString().slice(0, 10);
  });

  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(true);

  const gradientBtn =
    "px-4 py-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 " +
    "text-white text-sm font-medium shadow-md hover:brightness-110 " +
    "active:scale-95 transition-all";

  // --------- เช็กสิทธิ์ admin ---------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthChecked(true);
        router.replace("/");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data() as any | undefined;
        if (data?.isAdmin) {
          setIsAdmin(true);
        } else {
          router.replace("/card");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAuthChecked(true);
      }
    });

    return () => unsub();
  }, [router]);

  // --------- subscribe ประวัติการใช้คูปอง ---------
  useEffect(() => {
    if (!authChecked || !isAdmin) return;

    let unsub: (() => void) | null = null;
    setLoadingUsage(true);

    const usageRef = collection(db, "coupon_uses");

    let q;

    if (selectedDate) {
      // start = 00:00, end = 23:59:59.999 ของวันที่ที่เลือก
      const [year, month, day] = selectedDate.split("-").map((v) => Number(v));
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);

      q = query(
        usageRef,
        where("usedAt", ">=", start),
        where("usedAt", "<=", end),
        orderBy("usedAt", "desc"),
        limit(200)
      );
    } else {
      // ไม่เลือกวัน แสดงล่าสุดทั้งหมด
      q = query(usageRef, orderBy("usedAt", "desc"), limit(200));
    }

    unsub = onSnapshot(
      q,
      (snap) => {
        const items: UsageItem[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          items.push({
            id: d.id,
            userId: data.userId ?? "",
            phone: data.phone ?? "",
            freeCups: data.freeCups ?? 0,
            usedAt: data.usedAt?.toDate
              ? data.usedAt.toDate()
              : data.usedAt instanceof Date
              ? data.usedAt
              : null,
          });
        });
        setUsage(items);
        setLoadingUsage(false);
      },
      (err) => {
        console.error("usage subscribe error", err);
        setLoadingUsage(false);
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [authChecked, isAdmin, selectedDate]);

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 text-sm">กำลังโหลดข้อมูล...</p>
      </main>
    );
  }

  if (!isAdmin) {
    // ระหว่าง redirect จะเห็นหน้านี้แป๊บเดียว
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 text-sm">กำลังเปลี่ยนเส้นทาง...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      {/* HEADER */}
      <header className="w-full bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-semibold text-sm sm:text-base">
            การใช้งานคูปอง · Points Café
          </h1>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/admin")}
              className={gradientBtn}
            >
              กลับหน้าสร้าง QR
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
      <div className="flex-1 px-4 sm:px-6 py-6 flex flex-col items-center">
        <section className="w-full max-w-xl bg-white rounded-2xl shadow p-4 sm:p-6">
          <h2 className="text-base font-semibold mb-3">
            ประวัติการใช้คูปองฟรี 1 แก้วของลูกค้า
          </h2>

          {/* เลือกวันที่ */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-slate-600">
                เลือกวันที่ใช้คูปอง:
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
              ? `แสดงเฉพาะการใช้สิทธิ์ฟรี 1 แก้ว (แลกครบ 10 แก้วแล้ว) ในวันที่ ${selectedDate} (รวม ${usage.length} รายการ)`
              : `แสดงประวัติการใช้คูปองฟรี 1 แก้วล่าสุด (สูงสุด ${usage.length} รายการที่โหลดมา)`}
          </p>

          {loadingUsage ? (
            <p className="text-xs text-slate-500">กำลังโหลดประวัติ...</p>
          ) : usage.length === 0 ? (
            <p className="text-xs text-slate-500">
              ยังไม่มียอดลูกค้าที่ใช้คูปองฟรี 1 แก้วในช่วงวันที่ที่เลือก
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {usage.map((item) => (
                <li
                  key={item.id}
                  className="border border-slate-100 rounded-xl px-3 py-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-slate-800">
                      ลูกค้า:{" "}
                      {item.phone
                        ? item.phone
                        : "(ไม่ทราบเบอร์ / ไม่มีข้อมูลโทรศัพท์)"}
                    </p>
                    <p className="text-slate-700">
                      ใช้คูปองฟรี {item.freeCups ?? 1} แก้ว
                    </p>
                  </div>
                  <span className="text-slate-500 mt-1 sm:mt-0">
                    ใช้เมื่อ: {formatDateTime(item.usedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
