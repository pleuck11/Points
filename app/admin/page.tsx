"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  setDoc,
} from "firebase/firestore";

import QRCode from "react-qr-code";

type UserRoleDoc = {
  role?: string;
  email?: string;
  displayName?: string | null;
  phone?: string;
  points?: number;
};

type AppUser = {
  uid: string;
  email: string;
  displayName: string | null;
  phone: string;
  points: number;
  role?: string;
};

type PointLog = {
  id: string;
  delta: number;
  type?: string;
  createdAt?: any;
  source?: string;
  adminEmail?: string | null;
};

type PinRecord = {
  id: string;
  pin: string;
  points: number;
  createdAt?: any;
  used?: boolean;
  usedAt?: any;
};

export async function createPin(pin: string, points: number) {
  await setDoc(doc(db, "pins", pin), {
    points,
    used: false,
    createdAt: serverTimestamp(),
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [adjustInputs, setAdjustInputs] = useState<Record<string, number>>({});
  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  const [logsModalUser, setLogsModalUser] = useState<AppUser | null>(null);
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsFilter, setLogsFilter] = useState<
    "all" | "redeem" | "earn" | "admin"
  >("all");

  // สำหรับสร้าง PIN + ลิงก์
  const [baseUrl, setBaseUrl] = useState("");
  const [rewardPoints, setRewardPoints] = useState<number>(1);
  const [generatedPin, setGeneratedPin] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  // ประวัติการสร้าง PIN
  const [pinHistory, setPinHistory] = useState<PinRecord[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [pinsError, setPinsError] = useState<string | null>(null);

  // ตรวจสอบสิทธิ์ admin และโหลดรายชื่อลูกค้า
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        router.push("/login");
        return;
      }

      setUser(fbUser);

      const snap = await getDoc(doc(db, "users", fbUser.uid));

      if (!snap.exists()) {
        setRole("user");
        router.push("/reward_points");
        return;
      }

      const data = snap.data() as UserRoleDoc;
      const userRole = data.role || "user";
      setRole(userRole);

      if (userRole !== "admin") {
        router.push("/reward_points");
        return;
      }

      // โหลดรายชื่อลูกค้าทั้งหมด
      const usersSnap = await getDocs(collection(db, "users"));
      const list: AppUser[] = usersSnap.docs.map((d) => {
        const u = d.data() as UserRoleDoc;
        return {
          uid: d.id,
          email: u.email || "",
          displayName: u.displayName ?? null,
          phone: u.phone || "",
          points: u.points ?? 0,
          role: u.role,
        };
      });

      // เรียงตามชื่อ
      list.sort((a, b) => {
        const nameA = (a.displayName || a.phone || a.email).toLowerCase();
        const nameB = (b.displayName || b.phone || b.email).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setUsers(list);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  // baseUrl สำหรับสร้างลิงก์ (เช่น http://localhost:3000)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // ฟิลเตอร์รายชื่อลูกค้าจาก search + ซ่อนแอดมินเองออกจากตาราง
  const filteredUsers = users.filter((u) => {
    if (user && u.uid === user.uid) return false; // ซ่อนแอดมินเอง

    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    return (
      (u.displayName || "").toLowerCase().includes(term) ||
      (u.phone || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term)
    );
  });

  const handleChangeAdjust = (uid: string, value: string) => {
    const num = Number(value);
    setAdjustInputs((prev) => ({
      ...prev,
      [uid]: isNaN(num) ? 0 : num,
    }));
  };

  // ปุ่มเพิ่ม / หักแต้มฝั่งแอดมิน
  const handleAdjustPoints = async (
    targetUser: AppUser,
    mode: "add" | "subtract"
  ) => {
    if (!user) return;

    const raw = adjustInputs[targetUser.uid];
    const amount = !raw || raw <= 0 ? 1 : raw; // ถ้าไม่ใส่หรือ <=0 ให้ใช้ 1 แต้ม
    const delta = mode === "add" ? amount : -amount;

    setGlobalError(null);
    setGlobalMessage(null);

    try {
      setAdjustingUserId(targetUser.uid);

      const userRef = doc(db, "users", targetUser.uid);
      await updateDoc(userRef, { points: increment(delta) });

      const newPoints = targetUser.points + delta;

      // อัปเดต state รายชื่อลูกค้า
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUser.uid ? { ...u, points: newPoints } : u
        )
      );

      // บันทึกประวัติใน pointLogs subcollection
      await addDoc(collection(db, "users", targetUser.uid, "pointLogs"), {
        type: "admin_adjust",
        delta,
        newPoints,
        createdAt: serverTimestamp(),
        source: "admin",
        adminUid: user.uid,
        adminEmail: user.email || null,
      });

      setGlobalMessage(
        `อัปเดตแต้มให้ ${
          targetUser.displayName || targetUser.phone || targetUser.email
        } เรียบร้อย`
      );
    } catch (err) {
      console.error(err);
      setGlobalError("อัปเดตแต้มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setAdjustingUserId(null);
    }
  };

  // เปิดหน้าต่างป๊อปอัปดูประวัติแต้มของลูกค้าคนหนึ่ง
  const openLogsModal = async (targetUser: AppUser) => {
    setLogsModalUser(targetUser);
    setLogs([]);
    setLoadingLogs(true);
    setGlobalError(null);
    setLogsFilter("all");

    try {
      const qLogs = query(
        collection(db, "users", targetUser.uid, "pointLogs"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(qLogs);

      const list: PointLog[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          delta: data.delta ?? 0,
          type: data.type,
          createdAt: data.createdAt,
          source: data.source,
          adminEmail: data.adminEmail,
        };
      });

      setLogs(list);
    } catch (err) {
      console.error(err);
      setGlobalError("โหลดประวัติการใช้สิทธิ์ไม่สำเร็จ");
    } finally {
      setLoadingLogs(false);
    }
  };

  const closeLogsModal = () => {
    setLogsModalUser(null);
    setLogs([]);
    setLogsFilter("all");
  };

  // สร้าง PIN + ลิงก์รับแต้ม (บันทึกลง Firestore + push เข้า pinHistory)
  const handleGeneratePinAndLink = async () => {
    if (!user) return;

    const points = rewardPoints > 0 ? rewardPoints : 1;
    setRewardPoints(points);
    setCopyStatus("idle");
    setGlobalError(null);

    // PIN 6 หลัก
    const pin = Math.floor(100000 + Math.random() * 900000);
    const pinStr = String(pin);

    try {
      // สร้างเอกสาร PIN ใน collection "pins"
      const pinRef = doc(db, "pins", pinStr);
      await setDoc(pinRef, {
        points,
        used: false,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email || null,
      });

      const origin = baseUrl || "";
      const link = origin
        ? `${origin}/scan?pin=${pinStr}&points=${points}`
        : `/scan?pin=${pinStr}&points=${points}`;

      setGeneratedPin(pinStr);
      setGeneratedLink(link);

      // อัปเดตประวัติใน state ด้านหน้า (แทรกไว้บนสุด)
      setPinHistory((prev) => [
        {
          id: pinStr,
          pin: pinStr,
          points,
          createdAt: { toDate: () => new Date() } as any,
          used: false,
        },
        ...prev,
      ]);

      setGlobalMessage(`สร้าง PIN ${pinStr} สำหรับ ${points} แต้มเรียบร้อย`);
    } catch (err) {
      console.error(err);
      setGlobalError("ไม่สามารถสร้าง PIN ได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  // คัดลอกลิงก์
  const handleCopyLink = async () => {
    if (!generatedLink) return;
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyStatus("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  };

  // โหลดประวัติสร้าง PIN ล่าสุด (20 รายการ)
  useEffect(() => {
    const loadPinHistory = async () => {
      if (!user || role !== "admin") return;
      try {
        setLoadingPins(true);
        setPinsError(null);

        const qPins = query(
          collection(db, "pins"),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(qPins);
        const list: PinRecord[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            pin: d.id,
            points: data.points ?? 0,
            createdAt: data.createdAt,
            used: data.used ?? false,
            usedAt: data.usedAt,
          };
        });
        setPinHistory(list);
      } catch (err) {
        console.error(err);
        setPinsError("โหลดประวัติการสร้าง PIN ไม่สำเร็จ");
      } finally {
        setLoadingPins(false);
      }
    };

    loadPinHistory();
  }, [user, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-200">กำลังโหลดข้อมูลผู้ดูแลระบบ...</p>
      </div>
    );
  }

  if (!user || role !== "admin") {
    return null;
  }

  // ====== ฟิลเตอร์ประวัติใน modal ตามหมวดหมู่ ======
  const filteredLogsForModal =
    logsFilter === "all"
      ? logs
      : logs.filter((log) => {
          if (logsFilter === "redeem") {
            return (
              log.type === "redeem" ||
              (log.delta < 0 && log.source === "reward")
            );
          }
          if (logsFilter === "earn") {
            return log.delta > 0 && log.type !== "admin_adjust";
          }
          if (logsFilter === "admin") {
            return log.type === "admin_adjust";
          }
          return true;
        });

  return (
    <main className="relative min-h-screen flex flex-col bg-slate-950 overflow-hidden text-white">
      {/* Liquid glass background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-64 w-64 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-sky-400 via-emerald-400 to-indigo-500 flex items-center justify-center shadow-md shadow-sky-500/40">
              <span className="text-sm font-bold text-slate-950">A</span>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-semibold text-white">
                Admin Dashboard
              </h1>
              <p className="text-[11px] text-slate-200/80">
                จัดการแต้มสะสม / PIN / ลูกค้า
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-slate-200/80">
              เข้าสู่ระบบในชื่อ: {user.email}
            </span>
            <span className="md:hidden text-xs text-slate-200/80">
              {user.email}
            </span>
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
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-5 md:space-y-6">
        {/* แถวบน: สร้าง PIN / โปรไฟล์แอดมินเล็ก ๆ */}
        <section className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.9)] p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="flex-1">
              <h2 className="text-base md:text-lg font-semibold mb-1">
                สร้าง QR / PIN / ลิงก์รับแต้ม
              </h2>
              <p className="text-xs md:text-sm text-slate-200/80 mb-4">
                ใช้ส่วนนี้เพื่อสร้างรหัส PIN และลิงก์สำหรับให้ลูกค้าสแกนหรือกรอก
                เพื่อรับแต้มสะสมจากร้านของคุณ
              </p>

              <div className="flex flex-col md:flex-row md:items-end gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-slate-100">
                    จำนวนแต้มที่ลูกค้าจะได้รับต่อ 1 ครั้ง
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rewardPoints || ""}
                    onChange={(e) => setRewardPoints(Number(e.target.value))}
                    className="w-full md:w-40 rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
                  />
                  <p className="text-[11px] text-slate-300 mt-1">
                    เช่น กำหนด 1 แต้มต่อการสแกน 1 ครั้ง
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleGeneratePinAndLink}
                    className="rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 text-slate-950 px-4 py-2 text-sm font-medium shadow-lg shadow-sky-500/40 hover:opacity-95"
                  >
                    สร้าง PIN + ลิงก์รับแต้ม
                  </button>
                </div>
              </div>

              {generatedPin && (
                <div className="mt-3 rounded-2xl bg-slate-950/50 border border-white/15 p-3 space-y-3">
                  <div className="text-sm">
                    <span className="font-medium text-slate-50">
                      PIN ที่สร้าง:
                    </span>{" "}
                    <span className="font-mono text-base text-emerald-300">
                      {generatedPin}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    เมื่อลูกค้าใส่ PIN นี้หรือสแกน QR / เปิดลิงก์ด้านล่าง
                    จะได้รับแต้มตามที่กำหนด
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    {/* ลิงก์ */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1 text-slate-100">
                        ลิงก์รับแต้ม (นำไปแปะใน QR code หรือส่งให้ลูกค้า)
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          readOnly
                          value={generatedLink}
                          className="flex-1 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-[11px] md:text-xs text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="rounded-full bg-slate-50 text-slate-900 px-3 py-2 text-[11px] font-medium hover:bg-white"
                        >
                          คัดลอก
                        </button>
                      </div>
                      {copyStatus === "success" && (
                        <p className="text-[11px] text-emerald-300 mt-1">
                          คัดลอกลิงก์เรียบร้อยแล้ว
                        </p>
                      )}
                      {copyStatus === "error" && (
                        <p className="text-[11px] text-red-300 mt-1">
                          เบราว์เซอร์ไม่รองรับการคัดลอกอัตโนมัติ
                          กรุณาเลือกและคัดลอกเอง
                        </p>
                      )}
                    </div>

                    {/* QR CODE */}
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-medium mb-2 text-slate-100">
                        QR Code สำหรับลูกค้าสแกน
                      </span>
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                        <QRCode value={generatedLink || " "} size={144} />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    * คุณสามารถพิมพ์ QR นี้ไปติดที่ร้าน หรือบันทึกเป็นรูป
                    แล้วนำไปใช้งานในสื่ออื่น ๆ ได้
                  </p>
                </div>
              )}
            </div>

            {/* โปรไฟล์แอดมิน / สรุปสั้น ๆ */}
            <div className="w-full md:w-60 rounded-2xl border border-white/20 bg-slate-900/70 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-slate-950 font-bold text-sm">
                  {(user.email || "A").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-slate-200/90">Admin</p>
                  <p className="text-[11px] text-slate-300 break-all">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-slate-300">
                จัดการแต้มลูกค้า สร้าง PIN และตรวจสอบประวัติการใช้งานระบบสะสม
                แต้มจากที่เดียว
              </div>
            </div>
          </div>

          {/* ประวัติการสร้าง PIN ล่าสุด */}
          <div className="mt-5 border-t border-white/10 pt-3">
            <h3 className="text-xs font-semibold text-slate-100 mb-2">
              ประวัติการสร้าง PIN ล่าสุด
            </h3>
            {loadingPins ? (
              <p className="text-[11px] text-slate-300">
                กำลังโหลดประวัติการสร้าง PIN...
              </p>
            ) : pinsError ? (
              <p className="text-[11px] text-red-300">{pinsError}</p>
            ) : pinHistory.length === 0 ? (
              <p className="text-[11px] text-slate-300">
                ยังไม่เคยสร้าง PIN มาก่อน
              </p>
            ) : (
              <ul className="space-y-1 text-[11px] text-slate-200">
                {pinHistory.map((p) => {
                  const time = p.createdAt?.toDate
                    ? p.createdAt.toDate().toLocaleString("th-TH")
                    : "-";
                  const statusLabel = p.used ? "ใช้แล้ว" : "ยังไม่ได้ใช้";
                  const statusClass = p.used
                    ? "text-amber-300"
                    : "text-emerald-300";

                  return (
                    <li
                      key={p.id}
                      className="flex justify-between border-b border-white/10 pb-1 last:border-b-0"
                    >
                      <span>
                        PIN {p.pin} — {p.points} แต้ม{" "}
                        <span className={`ml-1 ${statusClass}`}>
                          ({statusLabel})
                        </span>
                      </span>
                      <span className="text-slate-400">{time}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* จัดการลูกค้า */}
        <section className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_18px_60px_rgba(15,23,42,0.9)] p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <h2 className="text-base md:text-lg font-semibold text-white">
              จัดการลูกค้า (ค้นหา / เพิ่ม-หักแต้ม / ดูประวัติ)
            </h2>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาจากชื่อ, เบอร์โทร, หรืออีเมล"
                className="w-full md:w-72 rounded-full border border-white/20 bg-slate-900/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
              />
            </div>
          </div>

          {globalError && (
            <div className="mb-2 rounded-xl bg-red-500/15 border border-red-400/60 text-red-100 px-3 py-2 text-xs">
              {globalError}
            </div>
          )}
          {globalMessage && (
            <div className="mb-2 rounded-xl bg-emerald-500/15 border border-emerald-400/60 text-emerald-100 px-3 py-2 text-xs">
              {globalMessage}
            </div>
          )}

          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-y-1">
              <thead>
                <tr className="text-xs text-slate-200/80">
                  <th className="text-left px-3 py-1">ลูกค้า</th>
                  <th className="text-left px-3 py-1">เบอร์โทร</th>
                  <th className="text-left px-3 py-1">อีเมล</th>
                  <th className="text-center px-3 py-1">แต้ม</th>
                  <th className="text-left px-3 py-1">จัดการแต้ม</th>
                  <th className="text-left px-3 py-1">ประวัติ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center text-xs text-slate-300 py-4"
                    >
                      ยังไม่มีลูกค้าหรือไม่พบข้อมูลที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const delta = adjustInputs[u.uid] ?? 10; // default 10 แต้ม
                    return (
                      <tr
                        key={u.uid}
                        className="bg-slate-950/60 rounded-xl border border-white/10"
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-sm text-white">
                            {u.displayName || "-"}
                          </div>
                          <div className="text-[11px] text-slate-300">
                            UID: {u.uid.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-200">
                          {u.phone || "-"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-slate-200">
                          {u.email}
                        </td>
                        <td className="px-3 py-2 align-top text-center">
                          <span className="inline-flex items-center justify-center rounded-full bg-sky-500/10 border border-sky-400/50 px-3 py-1 text-xs font-semibold text-sky-200">
                            {u.points} แต้ม
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={delta}
                              onChange={(e) =>
                                handleChangeAdjust(u.uid, e.target.value)
                              }
                              className="w-16 rounded-xl border border-white/20 bg-slate-900/70 px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500/80"
                            />
                            <button
                              onClick={() => handleAdjustPoints(u, "add")}
                              disabled={adjustingUserId === u.uid}
                              className="rounded-full bg-emerald-500 text-slate-950 px-2.5 py-1 text-xs font-medium hover:bg-emerald-400 disabled:opacity-50"
                            >
                              + เพิ่ม
                            </button>
                            <button
                              onClick={() => handleAdjustPoints(u, "subtract")}
                              disabled={adjustingUserId === u.uid}
                              className="rounded-full bg-amber-400 text-slate-950 px-2.5 py-1 text-xs font-medium hover:bg-amber-300 disabled:opacity-50"
                            >
                              - หัก
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <button
                            onClick={() => openLogsModal(u)}
                            className="text-xs text-sky-300 hover:text-sky-200 hover:underline"
                          >
                            ดูประวัติ
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modal ดูประวัติแต้มของลูกค้า */}
      {logsModalUser && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4"
          onClick={closeLogsModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-950/95 backdrop-blur-2xl p-5 shadow-[0_18px_60px_rgba(15,23,42,0.9)] max-h-[80vh] overflow-y-auto text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">
                  ประวัติการใช้สิทธิ์ / ปรับแต้ม
                </h2>
                <p className="text-[11px] text-slate-300">
                  ลูกค้า:{" "}
                  {logsModalUser.displayName ||
                    logsModalUser.phone ||
                    logsModalUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLogsModal}
                className="text-slate-400 hover:text-slate-100 text-lg leading-none"
              >
                ×
              </button>
            </div>

            {loadingLogs ? (
              <p className="text-xs text-slate-300">กำลังโหลดประวัติ...</p>
            ) : logs.length === 0 ? (
              <p className="text-xs text-slate-300">
                ยังไม่มีประวัติการใช้สิทธิ์หรือการปรับแต้ม
              </p>
            ) : (
              <>
                {/* ปุ่มเลือกหมวดหมู่ */}
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setLogsFilter("all")}
                    className={`px-3 py-1 rounded-full border ${
                      logsFilter === "all"
                        ? "bg-sky-500 text-slate-950 border-sky-400"
                        : "bg-slate-950/70 text-slate-200 border-white/20"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogsFilter("redeem")}
                    className={`px-3 py-1 rounded-full border ${
                      logsFilter === "redeem"
                        ? "bg-sky-500 text-slate-950 border-sky-400"
                        : "bg-slate-950/70 text-slate-200 border-white/20"
                    }`}
                  >
                    การใช้สิทธิ์
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogsFilter("earn")}
                    className={`px-3 py-1 rounded-full border ${
                      logsFilter === "earn"
                        ? "bg-sky-500 text-slate-950 border-sky-400"
                        : "bg-slate-950/70 text-slate-200 border-white/20"
                    }`}
                  >
                    รับแต้ม
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogsFilter("admin")}
                    className={`px-3 py-1 rounded-full border ${
                      logsFilter === "admin"
                        ? "bg-sky-500 text-slate-950 border-sky-400"
                        : "bg-slate-950/70 text-slate-200 border-white/20"
                    }`}
                  >
                    การปรับของแอดมิน
                  </button>
                </div>

                {filteredLogsForModal.length === 0 ? (
                  <p className="text-xs text-slate-300">
                    ไม่มีรายการในหมวดหมู่นี้
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {filteredLogsForModal.map((log) => {
                      const sign = log.delta > 0 ? "+" : "";
                      const time = log.createdAt?.toDate
                        ? log.createdAt.toDate().toLocaleString("th-TH")
                        : "-";

                      let typeLabel = "รายการแต้ม";
                      if (log.type === "admin_adjust") {
                        typeLabel = "ปรับแต้มโดยแอดมิน";
                      } else if (log.type === "redeem") {
                        typeLabel = "ใช้สิทธิ์แลกรางวัล";
                      } else if (log.source === "pin") {
                        typeLabel = "รับแต้มจาก PIN";
                      } else if (log.source === "reward" && log.delta < 0) {
                        typeLabel = "ใช้สิทธิ์แลกรางวัล";
                      }

                      return (
                        <li
                          key={log.id}
                          className="rounded-xl border border-white/20 bg-slate-900/80 px-3 py-2"
                        >
                          <div className="flex justify-between mb-1">
                            <span className="font-medium text-slate-50">
                              {typeLabel}
                            </span>
                            <span
                              className={
                                log.delta >= 0
                                  ? "text-emerald-300 font-semibold"
                                  : "text-amber-300 font-semibold"
                              }
                            >
                              {sign}
                              {log.delta} แต้ม
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            <div>วันที่: {time}</div>
                            {log.adminEmail && (
                              <div>ผู้ดำเนินการ: {log.adminEmail}</div>
                            )}
                            {log.source && <div>ช่องทาง: {log.source}</div>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={closeLogsModal}
                className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-white"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
