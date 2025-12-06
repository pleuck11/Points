// app/reward_points/RewardPointsClient.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

type UserDoc = {
  displayName?: string;
  email?: string;
  phone?: string;
  points?: number;
};

type RedeemLog = {
  id: string;
  delta: number;
  createdAt?: any;
  source?: string;
  type?: string;
};

function formatThaiDateTime(ts: any) {
  if (!ts?.toDate) return "-";
  const d = ts.toDate() as Date;
  return d.toLocaleString("th-TH");
}

export default function RewardPointsClient() {
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

  // ใช้แต้มสะสมแลกรางวัล
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // ประวัติการใช้แต้ม (แลกรางวัลครบ 10 แต้ม)
  const [redeemLogs, setRedeemLogs] = useState<RedeemLog[]>([]);
  const [loadingRedeemLogs, setLoadingRedeemLogs] = useState(false);

  // ถ้าเข้ามาพร้อม query ?pin=xxxx ให้เปิด modal ให้เลย
  useEffect(() => {
    const pinFromQuery = searchParams.get("pin");
    if (pinFromQuery) {
      setPinInput(pinFromQuery);
      setPinModalOpen(true);
    }
  }, [searchParams]);

  // โหลด user + ข้อมูลแต้ม
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

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  // โหลดประวัติแลกรางวัล (ใช้แต้มสะสมครบ 10 แต้ม)
  const fetchRedeemLogsForUser = async (uid: string) => {
    try {
      setLoadingRedeemLogs(true);
      const qLogs = query(
        collection(db, "users", uid, "pointLogs"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const snap = await getDocs(qLogs);
      const list: RedeemLog[] = snap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            delta: data.delta ?? 0,
            createdAt: data.createdAt,
            source: data.source,
            type: data.type,
          };
        })
        // เอาเฉพาะที่เป็นการใช้สิทธิ์แลกรางวัล
        .filter(
          (log) =>
            log.delta < 0 &&
            (log.source === "reward" || log.type === "redeem")
        );

      setRedeemLogs(list);
    } catch (err) {
      console.error("load redeem logs error:", err);
    } finally {
      setLoadingRedeemLogs(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchRedeemLogsForUser(user.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const currentPoints = userDoc?.points ?? 0;
  const stampsPerReward = 10;

  // แสดงสแตมป์ในรอบปัจจุบัน
  const stampsInCurrentCycle = currentPoints % stampsPerReward;
  const stampsFilled = Math.min(stampsInCurrentCycle, stampsPerReward);
  const stampsEmpty = Math.max(0, stampsPerReward - stampsFilled);
  const stampsRemaining = Math.max(0, stampsPerReward - stampsInCurrentCycle);
  const canRedeem = currentPoints >= stampsPerReward;

  // ใช้ PIN จริง ๆ
  const handleSubmitPin = async (e: FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinMessage(null);

    if (!user || !userDoc) {
      setPinError("กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      return;
    }

    const pin = pinInput.trim();
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

  // ใช้แต้มสะสม 10 แต้มแลกรางวัล
  const handleRedeem = async () => {
    setRedeemError(null);
    setRedeemMessage(null);

    if (!user || !userDoc) {
      setRedeemError("กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      return;
    }

    if (!canRedeem) {
      setRedeemError("แต้มสะสมยังไม่ครบ 10 แต้ม");
      return;
    }

    try {
      setRedeemLoading(true);
      const userRef = doc(db, "users", user.uid);

      await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        const current = (userSnap.data()?.points ?? 0) as number;

        if (current < stampsPerReward) {
          throw new Error("NOT_ENOUGH_POINTS");
        }

        const newPoints = current - stampsPerReward;

        tx.update(userRef, {
          points: newPoints,
        });

        const logRef = doc(collection(db, "users", user.uid, "pointLogs"));
        tx.set(logRef, {
          type: "redeem",
          delta: -stampsPerReward,
          newPoints,
          createdAt: serverTimestamp(),
          source: "reward",
        });
      });

      // อัปเดต state ฝั่ง client
      setUserDoc((prev) =>
        prev
          ? {
              ...prev,
              points: (prev.points ?? 0) - stampsPerReward,
            }
          : prev
      );

      setRedeemMessage("ใช้แต้มสะสม 10 แต้มแลกรางวัลเรียบร้อยแล้ว");

      // โหลดประวัติใหม่
      if (user) {
        fetchRedeemLogsForUser(user.uid);
      }
    } catch (err: any) {
      console.error("Redeem error:", err);
      const msg =
        err?.message === "NOT_ENOUGH_POINTS"
          ? "แต้มสะสมไม่เพียงพอ"
          : "ไม่สามารถใช้แต้มสะสมได้ กรุณาลองใหม่อีกครั้ง";
      setRedeemError(msg);
    } finally {
      setRedeemLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-200">กำลังโหลดข้อมูลสมาชิก...</p>
      </div>
    );
  }

  if (!user || !userDoc) {
    return null;
  }

  return (
    <main className="relative min-h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Liquid background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-64 w-64 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute top-1/2 -right-32 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 w-full border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-sky-400 via-emerald-400 to-indigo-500 flex items-center justify-center shadow-md shadow-sky-500/40">
              <span className="text-sm font-bold text-slate-950">P</span>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-semibold text-white">
                แต้มสะสมของฉัน
              </h1>
              <p className="text-[11px] text-slate-200/80">
                {userDoc.displayName || userDoc.phone || userDoc.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* เมนู dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full border border-white/20 bg-slate-900/60 px-3 py-1 text-xs md:text-sm text-slate-50 hover:bg-slate-900/90"
              >
                เมนู ▾
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-white/15 bg-slate-900/95 backdrop-blur-xl shadow-xl text-xs md:text-sm z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setPinModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-50"
                  >
                    ใส่ PIN รับแต้ม
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/scan");
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-50"
                  >
                    สแกน QR
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSignOut}
              className="text-xs md:text-sm text-red-300 hover:text-red-200 hover:underline"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-5 md:space-y-6">
        {/* ข้อมูลสมาชิก + แต้มรวม */}
        <section className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.9)] p-5 md:p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-900/70 flex items-center justify-center border border-white/10">
                <span className="text-lg font-semibold">
                  {(userDoc.displayName || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-base md:text-lg font-semibold">
                  {userDoc.displayName || "-"}
                </h2>
                <p className="text-[11px] md:text-xs text-slate-200/80">
                  เบอร์: {userDoc.phone || "-"}
                </p>
                <p className="text-[11px] md:text-xs text-slate-200/80">
                  อีเมล: {userDoc.email || "-"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[11px] text-slate-200/80 mb-1">
                แต้มสะสมทั้งหมด
              </p>
              <div className="inline-flex items-baseline gap-1 rounded-2xl bg-slate-900/70 border border-white/10 px-3 py-2">
                <span className="text-2xl font-semibold text-emerald-300">
                  {currentPoints}
                </span>
                <span className="text-xs text-slate-100">แต้ม</span>
              </div>
            </div>
          </div>
        </section>

        {/* การ์ดแต้มสะสม Brown cafe */}
        <section className="flex justify-center">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#4b3326] shadow-[0_18px_60px_rgba(15,23,42,0.9)] overflow-hidden">
            {/* หัวการ์ดสีน้ำตาลเข้ม */}
            <div className="h-16 bg-[#382318]" />

            {/* เนื้อหา */}
            <div className="px-6 pb-6">
              <div className="flex flex-col items-center -mt-10">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden border border-[#efdfc5]">
                  {/* รูปแก้วกาแฟ (ใช้ <img> ธรรมดา) */}
                  <img
                    src="https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=200&q=80"
                    alt="Coffee cup"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="mt-3 text-xl font-semibold text-[#fdf3df]">
                  Brown cafe
                </h3>

                <p className="mt-2 text-xs text-[#f9e8c9]">
                  อีก {stampsRemaining} แต้มจะได้รับของรางวัล
                </p>

                <button
                  type="button"
                  disabled={!canRedeem || redeemLoading}
                  onClick={handleRedeem}
                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm ${
                    canRedeem
                      ? "bg-[#f5d8a5] hover:bg-[#f2c883] text-[#3b2615]"
                      : "bg-[#7b6046] text-[#f2ddc1] cursor-not-allowed"
                  }`}
                >
                  ใช้แต้มสะสม (10 แต้ม)
                </button>

                {redeemMessage && (
                  <p className="mt-2 text-[11px] text-emerald-200">
                    {redeemMessage}
                  </p>
                )}
                {redeemError && (
                  <p className="mt-2 text-[11px] text-red-200">{redeemError}</p>
                )}
              </div>

              {/* แถว stamp 10 ช่อง */}
              <div className="mt-4 grid grid-cols-5 gap-2 justify-items-center">
                {Array.from({ length: stampsFilled }).map((_, i) => (
                  <div
                    key={`f-${i}`}
                    className="w-10 h-10 rounded-full border-2 border-[#f2d29e] bg-[#f2d29e] flex items-center justify-center text-[10px] font-bold text-[#3b2615]"
                  >
                    STAMP
                  </div>
                ))}
                {Array.from({ length: stampsEmpty }).map((_, i) => (
                  <div
                    key={`e-${i}`}
                    className="w-10 h-10 rounded-full border-2 border-[#b38c62] bg-transparent flex items-center justify-center text-[10px] text-[#d6b791]"
                  >
                    +
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center">
                <p className="text-[11px] text-[#f7e4c7]">
                  สะสมครบ 10 แต้มจึงจะใช้สิทธิ์แลกรางวัลได้
                </p>
                <p className="text-[11px] text-[#f2d29e] mt-1">
                  แต้มทั้งหมดของคุณตอนนี้: {currentPoints} แต้ม
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ประวัติการใช้แต้ม (แลกรางวัลครบ 10 แต้ม) */}
        <section className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.9)] p-5 md:p-6 text-white">
          <h2 className="text-base md:text-lg font-semibold mb-2">
            ประวัติการใช้แต้ม (แลกรางวัล)
          </h2>

          {loadingRedeemLogs ? (
            <p className="text-xs text-slate-200/80">กำลังโหลดประวัติ...</p>
          ) : redeemLogs.length === 0 ? (
            <p className="text-xs text-slate-200/80">
              ยังไม่เคยใช้แต้มสะสมแลกรางวัล
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {redeemLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-slate-50">
                      แลกรางวัลสำเร็จ
                    </div>
                    <div className="text-[11px] text-slate-200/80">
                      วันที่/เวลา: {formatThaiDateTime(log.createdAt)}
                    </div>
                  </div>
                  <div className="text-amber-300 font-semibold">
                    {log.delta} แต้ม
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

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
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900/95 backdrop-blur-2xl p-5 shadow-xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold mb-2">
              ใส่ PIN เพื่อรับแต้มสะสม
            </h2>
            <p className="text-xs text-slate-200/80 mb-3">
              กรอก PIN ที่ได้รับจากร้าน หรือเปิดลิงก์ที่มี PIN
              ระบบจะเพิ่มแต้มให้ในบัญชีของคุณ
            </p>

            {pinError && (
              <div className="mb-2 rounded-xl bg-red-500/15 border border-red-400/60 text-red-100 px-3 py-2 text-xs">
                {pinError}
              </div>
            )}
            {pinMessage && (
              <div className="mb-2 rounded-xl bg-emerald-500/15 border border-emerald-400/60 text-emerald-100 px-3 py-2 text-xs">
                {pinMessage}
              </div>
            )}

            <form onSubmit={handleSubmitPin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-100">
                  PIN 6 หลัก
                </label>
                <input
                  type="text"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="เช่น 349990"
                  className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
                />
              </div>

              <button
                type="submit"
                disabled={pinLoading}
                className="w-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 text-slate-950 py-2 text-sm font-medium shadow-lg shadow-sky-500/40 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="mt-3 w-full text-center text-xs text-slate-300 hover:underline"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
