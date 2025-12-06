"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  collection,
  serverTimestamp,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

// ใช้ dynamic import ป้องกันปัญหา window ในฝั่ง server
const QrReader = dynamic(
  () => import("react-qr-reader").then((m) => m.QrReader),
  { ssr: false }
);

type UserDoc = {
  displayName?: string;
  email?: string;
  phone?: string;
  points?: number;
};

type RewardHistoryItem = {
  id: string;
  delta: number;
  createdAt?: any;
  type?: string;
  source?: string;
};

export default function RewardPointsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);

  // PIN modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // QR modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrProcessing, setQrProcessing] = useState(false);

  // ประวัติการใช้แต้ม (แลกรางวัลครบ 10 แต้ม)
  const [history, setHistory] = useState<RewardHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ถ้าเข้ามาพร้อม query ?pin=xxxx ให้เปิด modal ให้เลย
  useEffect(() => {
    const pinFromQuery = searchParams.get("pin");
    if (pinFromQuery) {
      setPinInput(pinFromQuery);
      setPinModalOpen(true);
    }
  }, [searchParams]);

  // โหลด user + ข้อมูลแต้ม + ประวัติแลกรางวัล
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        router.push("/login");
        return;
      }

      setUser(fbUser);

      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (snap.exists()) {
        const data = snap.data() as UserDoc;
        setUserDoc({
          displayName: data.displayName || "",
          email: data.email || fbUser.email || "",
          phone: data.phone || "",
          points: data.points ?? 0,
        });
      } else {
        setUserDoc({
          displayName: fbUser.displayName || "",
          email: fbUser.email || "",
          phone: "",
          points: 0,
        });
      }

      // โหลดประวัติแลกรางวัล (ใช้สิทธิ์)
      setHistoryLoading(true);
      try {
        const qLogs = query(
          collection(db, "users", fbUser.uid, "pointLogs"),
          orderBy("createdAt", "desc"),
          limit(30)
        );
        const hsnap = await getDocs(qLogs);
        const list: RewardHistoryItem[] = hsnap.docs
          .map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              delta: data.delta ?? 0,
              createdAt: data.createdAt,
              type: data.type,
              source: data.source,
            };
          })
          .filter(
            (item) =>
              item.type === "redeem" ||
              (item.delta < 0 && item.source === "reward")
          );
        setHistory(list);
      } catch (err) {
        console.error("load history error", err);
      } finally {
        setHistoryLoading(false);
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const currentPoints = userDoc?.points ?? 0;
  const stampsPerReward = 10;
  const stampsFilled = Math.min(currentPoints, stampsPerReward);
  const stampsEmpty = Math.max(0, stampsPerReward - stampsFilled);
  const stampsRemaining = Math.max(0, stampsPerReward - stampsFilled);

  // ====== ฟังก์ชันใช้ PIN จริง ๆ (ทั้งจากการกรอก และการสแกน QR) ======
  const redeemPin = async (pinStr: string) => {
    setPinError(null);
    setPinMessage(null);

    if (!user || !userDoc) {
      setPinError("กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      return;
    }

    const pin = pinStr.trim();
    if (!pin) {
      setPinError("กรุณากรอก PIN");
      return;
    }

    try {
      setPinLoading(true);

      const userRef = doc(db, "users", user.uid);
      const pinRef = doc(db, "pins", pin);

      let plusPoints = 0;

      await runTransaction(db, async (tx) => {
        const pinSnap = await tx.get(pinRef);
        if (!pinSnap.exists()) {
          throw new Error("PIN_NOT_FOUND");
        }

        const pinData = pinSnap.data() as any;

        if (pinData.used) {
          throw new Error("PIN_USED");
        }

        const p = typeof pinData.points === "number" ? pinData.points : 0;
        if (p <= 0) {
          throw new Error("PIN_ZERO_POINTS");
        }

        const userSnap = await tx.get(userRef);
        const current = (userSnap.data()?.points ?? 0) as number;
        const newPoints = current + p;

        plusPoints = p;

        // อัปเดตแต้มใน users
        tx.update(userRef, {
          points: newPoints,
        });

        // เพิ่ม log ใน pointLogs
        const logRef = doc(collection(db, "users", user.uid, "pointLogs"));
        tx.set(logRef, {
          type: "pin_redeem",
          delta: p,
          newPoints,
          createdAt: serverTimestamp(),
          source: "pin",
          pin,
        });

        // อัปเดตสถานะ PIN
        tx.update(pinRef, {
          used: true,
          usedBy: user.uid,
          usedByEmail: user.email || null,
          usedAt: serverTimestamp(),
        });
      });

      // อัปเดต state หน้าเว็บ
      if (plusPoints > 0) {
        setUserDoc((prev) =>
          prev
            ? {
                ...prev,
                points: (prev.points ?? 0) + plusPoints,
              }
            : prev
        );

        setPinMessage(`ใช้ PIN สำเร็จ ได้รับ ${plusPoints} แต้ม`);
        setPinInput("");
      }
    } catch (err: any) {
      console.error("Use PIN error:", err);

      const msg =
        err?.message === "PIN_NOT_FOUND"
          ? "ไม่พบ PIN นี้ หรืออาจถูกลบไปแล้ว"
          : err?.message === "PIN_USED"
          ? "PIN นี้ถูกใช้งานไปแล้ว"
          : err?.message === "PIN_ZERO_POINTS"
          ? "PIN นี้ไม่มีแต้มให้แลก"
          : "ไม่สามารถใช้ PIN ได้ กรุณาลองใหม่อีกครั้ง";

      setPinError(msg);
    } finally {
      setPinLoading(false);
    }
  };

  // submit จากฟอร์ม PIN
  const handleSubmitPin = async (e: FormEvent) => {
    e.preventDefault();
    await redeemPin(pinInput);
  };

  // ใช้แต้มสะสม 10 แต้ม แลกรางวัล (ปุ่ม “ใช้แต้มสะสม”)
  const handleUseReward = async () => {
    if (!user || !userDoc) return;

    if (currentPoints < stampsPerReward) {
      alert("ยังมีแต้มไม่ครบ 10 แต้ม ไม่สามารถใช้สิทธิ์ได้");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        const cur = (snap.data()?.points ?? 0) as number;
        if (cur < stampsPerReward) {
          throw new Error("NOT_ENOUGH_POINTS");
        }
        const newPoints = cur - stampsPerReward;

        tx.update(userRef, { points: newPoints });

        const logRef = doc(collection(db, "users", user.uid, "pointLogs"));
        tx.set(logRef, {
          type: "redeem",
          delta: -stampsPerReward,
          newPoints,
          createdAt: serverTimestamp(),
          source: "reward",
        });
      });

      // อัปเดต state
      setUserDoc((prev) =>
        prev
          ? {
              ...prev,
              points: (prev.points ?? 0) - stampsPerReward,
            }
          : prev
      );

      // เพิ่มใน history ด้านล่าง
      setHistory((prev) => [
        {
          id: Math.random().toString(36).slice(2),
          delta: -stampsPerReward,
          createdAt: { toDate: () => new Date() },
          type: "redeem",
          source: "reward",
        },
        ...prev,
      ]);

      alert("ใช้แต้มสะสมแลกรางวัลเรียบร้อยแล้ว");
    } catch (err: any) {
      console.error("use reward error", err);
      if (err?.message === "NOT_ENOUGH_POINTS") {
        alert("แต้มในระบบไม่พอแล้ว กรุณารีเฟรชหน้าหรือเข้าสู่ระบบใหม่อีกครั้ง");
      } else {
        alert("ไม่สามารถใช้แต้มสะสมได้ กรุณาลองใหม่");
      }
    }
  };

  // ====== handle เมื่อสแกน QR ได้ค่า ======
  const handleQrDetected = async (text: string) => {
    if (qrProcessing) return;
    if (!text) return;

    setQrProcessing(true);
    setQrError(null);

    try {
      let pinFromQr = "";

      // ถ้าเป็นลิงก์ เช่น https://.../scan?pin=123456&points=1
      try {
        const url = new URL(text);
        pinFromQr = url.searchParams.get("pin") || "";
      } catch {
        // ถ้า parse เป็น URL ไม่ได้ ให้ถือว่าเป็น PIN ตรง ๆ
        pinFromQr = text.trim();
      }

      if (!pinFromQr) {
        setQrError("QR นี้ไม่มีข้อมูล PIN");
        return;
      }

      // ปิดหน้าสแกน แล้วเปิด PIN modal พร้อมเรียก redeemPin
      setQrModalOpen(false);
      setPinModalOpen(true);
      setPinInput(pinFromQr);

      await redeemPin(pinFromQr);
    } finally {
      setQrProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600">กำลังโหลดข้อมูลสมาชิก...</p>
      </div>
    );
  }

  if (!user || !userDoc) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <header className="w-full bg-white shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="font-semibold text-lg">แต้มสะสมของฉัน</h1>

          <div className="flex items-center gap-3">
            {/* เมนู dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full border px-3 py-1 text-sm bg-white hover:bg-slate-50"
              >
                เมนู ▾
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-white shadow-lg text-sm z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setPinModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100"
                  >
                    ใส่ PIN รับแต้ม
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setQrModalOpen(true);
                      setQrError(null);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100"
                  >
                    สแกน QR รับแต้ม
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:underline"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* ข้อมูลสมาชิก */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-base font-semibold mb-2">ข้อมูลสมาชิก</h2>
          <p className="text-sm">ชื่อที่แสดง: {userDoc.displayName || "-"}</p>
          <p className="text-sm">เบอร์โทร: {userDoc.phone || "-"}</p>
          <p className="text-sm">อีเมล: {userDoc.email || "-"}</p>
        </section>

        {/* การ์ดแต้มสะสมแบบ Brown cafe */}
        <section className="flex justify-center">
          <div className="w-full max-w-md bg-[#4b3326] text-white rounded-3xl shadow-lg overflow-hidden">
            {/* เนื้อหา */}
            <div className="px-6 py-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                  <span className="text-3xl">☕</span>
                </div>
                <h3 className="mt-3 text-xl font-semibold">Brown cafe</h3>

                <p className="text-xs text-slate-200 mt-1">
                  อีก {stampsRemaining} แต้มจะได้รับของรางวัล
                </p>

                <button
                  type="button"
                  onClick={handleUseReward}
                  className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm"
                >
                  ใช้แต้มสะสม
                </button>
              </div>

              {/* แถว stamp 10 ช่อง */}
              <div className="mt-4 grid grid-cols-5 gap-2 justify-items-center">
                {Array.from({ length: stampsFilled }).map((_, i) => (
                  <div
                    key={`f-${i}`}
                    className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-emerald-500 flex items-center justify-center text-[10px] font-bold"
                  >
                    STAMP
                  </div>
                ))}
                {Array.from({ length: stampsEmpty }).map((_, i) => (
                  <div
                    key={`e-${i}`}
                    className="w-10 h-10 rounded-full border-2 border-slate-400 bg-transparent flex items-center justify-center text-[10px] text-slate-300"
                  >
                    +
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center">
                <p className="text-[11px] text-slate-200">
                  ต่อเมื่อสะสมครบ 10 แต้มจึงจะใช้สิทธิ์ได้
                </p>
                <p className="text-[11px] text-emerald-300 mt-1">
                  แต้มทั้งหมดของคุณตอนนี้: {currentPoints} แต้ม
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ประวัติการใช้แต้ม (แลกรางวัลครบ 10 แต้ม) */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-base font-semibold mb-2">
            ประวัติการใช้แต้ม (แลกรางวัลครบ 10 แต้ม)
          </h2>

          {historyLoading ? (
            <p className="text-xs text-slate-500">กำลังโหลดประวัติ...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500">
              ยังไม่มีประวัติการใช้แต้มแลกรางวัล
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {history.map((h) => {
                const time = h.createdAt?.toDate
                  ? h.createdAt.toDate().toLocaleString("th-TH")
                  : "-";
                return (
                  <li key={h.id} className="py-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        ใช้แต้มสะสมแลกรางวัล {Math.abs(h.delta)} แต้ม
                      </div>
                      <div className="text-[11px] text-slate-500">
                        วันที่ / เวลา: {time}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-amber-700">
                      {h.delta} แต้ม
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {/* Modal ใส่ PIN */}
      {pinModalOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            setPinModalOpen(false);
            setPinError(null);
            setPinMessage(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold mb-2">
              ใส่ PIN เพื่อรับแต้มสะสม
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              กรอก PIN ที่ได้รับจากร้าน หรือสแกน QR แล้วระบบดึง PIN ให้อัตโนมัติ
              ระบบจะเพิ่มแต้มให้ในบัญชีของคุณ
            </p>

            {pinError && (
              <div className="mb-2 rounded-md bg-red-100 text-red-700 px-3 py-2 text-xs">
                {pinError}
              </div>
            )}
            {pinMessage && (
              <div className="mb-2 rounded-md bg-emerald-100 text-emerald-700 px-3 py-2 text-xs">
                {pinMessage}
              </div>
            )}

            <form onSubmit={handleSubmitPin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  PIN 6 หลัก
                </label>
                <input
                  type="text"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="เช่น 349990"
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={pinLoading}
                className="w-full rounded-md bg-sky-600 text-white py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {pinLoading ? "กำลังใช้ PIN..." : "ยืนยันการใช้ PIN"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setPinModalOpen(false);
                setPinError(null);
                setPinMessage(null);
              }}
              className="mt-3 w-full text-center text-xs text-slate-500 hover:underline"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* Modal สแกน QR */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            setQrModalOpen(false);
            setQrError(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold mb-2">
              สแกน QR เพื่อรับแต้มสะสม
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              นำกล้องไปส่อง QR ที่ร้านค้า ระบบจะอ่าน PIN จากลิงก์ใน QR
              แล้วเพิ่มแต้มให้โดยอัตโนมัติ
            </p>

            <div className="w-full rounded-lg overflow-hidden border">
              <QrReader
                constraints={{ facingMode: "environment" }}
                onResult={(
                  result: any,
                  _error: any // eslint-disable-line @typescript-eslint/no-unused-vars
                ) => {
                  if (!!result) {
                    const text = result.getText();
                    void handleQrDetected(text);
                  }
                }}
                containerStyle={{ width: "100%" }}
                videoStyle={{ width: "100%" }}
              />
            </div>

            {qrError && (
              <div className="mt-2 text-xs text-red-600">{qrError}</div>
            )}
            {qrProcessing && (
              <div className="mt-2 text-xs text-slate-500">
                กำลังประมวลผล QR...
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setQrModalOpen(false);
                setQrError(null);
              }}
              className="mt-3 w-full text-center text-xs text-slate-500 hover:underline"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
