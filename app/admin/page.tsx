"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useDemo, DemoUser, DemoPinRecord, DemoPointLog } from "@/lib/demo-context";
import DemoBar from "@/components/DemoBar";

function formatDateTime(ts: any) {
  if (!ts) return "-";
  if (typeof ts === "string") return ts;
  return "-";
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    adminUser,
    adminCustomers,
    adminPins,
    generatePin,
    adjustCustomerPoints,
    getCustomerLogs,
  } = useDemo();

  const [search, setSearch] = useState("");
  const [adjustInputs, setAdjustInputs] = useState<Record<string, number>>({});
  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  const [logsModalUser, setLogsModalUser] = useState<DemoUser | null>(null);
  const [logs, setLogs] = useState<DemoPointLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsFilter, setLogsFilter] = useState<"all" | "redeem" | "earn" | "admin">("all");

  const [baseUrl, setBaseUrl] = useState("");
  const [rewardPoints, setRewardPoints] = useState<number>(1);
  const [generatedPin, setGeneratedPin] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const handleSignOut = () => {
    router.push("/");
  };

  const filteredUsers = adminCustomers.filter((u) => {
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

  const handleAdjustPoints = (targetUser: DemoUser, mode: "add" | "subtract") => {
    const raw = adjustInputs[targetUser.uid];
    const amount = !raw || raw <= 0 ? 1 : raw;
    const delta = mode === "add" ? amount : -amount;

    setGlobalError(null);
    setGlobalMessage(null);
    setAdjustingUserId(targetUser.uid);
    setTimeout(() => {
      adjustCustomerPoints(targetUser.uid, delta);
      setGlobalMessage(
        `ปรับแต้ม ${targetUser.displayName || targetUser.phone} (${delta > 0 ? `+${delta}` : delta} แต้ม) สำเร็จ`
      );
      setAdjustingUserId(null);
    }, 200);
  };

  const openLogsModal = (targetUser: DemoUser) => {
    setLogsModalUser(targetUser);
    setLogs([]);
    setLoadingLogs(true);
    setGlobalError(null);
    setLogsFilter("all");

    setTimeout(() => {
      const demoLogs = getCustomerLogs(targetUser.uid);
      setLogs(demoLogs);
      setLoadingLogs(false);
    }, 150);
  };

  const closeLogsModal = () => {
    setLogsModalUser(null);
    setLogs([]);
    setLogsFilter("all");
  };

  const handleGeneratePinAndLink = () => {
    const points = rewardPoints > 0 ? rewardPoints : 1;
    setRewardPoints(points);
    setCopyStatus("idle");
    setGlobalError(null);

    const newPin = generatePin(points);
    const origin = baseUrl || "";
    const link = origin
      ? `${origin}/reward_points?pin=${newPin.pin}&demo=true`
      : `/reward_points?pin=${newPin.pin}&demo=true`;

    setGeneratedPin(newPin.pin);
    setGeneratedLink(link);
    setGlobalMessage(`สร้าง PIN #${newPin.pin} สำหรับ ${points} แต้มเรียบร้อยแล้ว`);
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyStatus("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2500);
    } catch {
      setCopyStatus("error");
    }
  };

  const filteredLogsForModal =
    logsFilter === "all"
      ? logs
      : logs.filter((log) => {
          if (logsFilter === "redeem") {
            return log.type === "redeem" || (log.delta < 0 && log.source === "reward");
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
    <main className="relative min-h-screen flex flex-col bg-[#090d16] text-white overflow-hidden pb-12">
      <DemoBar currentRole="admin" />

      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-amber-500/8 blur-[140px]" />
      </div>

      {/* Navbar */}
      <header className="relative z-40 w-full border-b border-white/8 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L14.4 9H22L15.8 13.5L18.2 20.5L12 16L5.8 20.5L8.2 13.5L2 9H9.6Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-semibold text-white">Points</h1>
                <span className="text-[10px] border border-indigo-400/30 text-indigo-400 px-1.5 py-0.5 rounded-full">
                  Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-500">{adminUser.displayName}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/reward_points?demo=true"
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs transition"
            >
              มุมมองลูกค้า
            </Link>
            <button
              onClick={handleSignOut}
              className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-300 transition"
            >
              ออก
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-6 space-y-5 w-full">
        {/* Alerts */}
        {globalError && (
          <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-4 py-3 text-xs">
            {globalError}
          </div>
        )}
        {globalMessage && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 px-4 py-3 text-xs flex items-center justify-between">
            <span>{globalMessage}</span>
            <button onClick={() => setGlobalMessage(null)} className="text-emerald-400 ml-3">✕</button>
          </div>
        )}

        {/* Section 1: Create PIN & QR */}
        <section className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white">สร้างรหัส PIN &amp; QR Code</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  กำหนดจำนวนแต้มแล้วกดสร้าง PIN เพื่อให้ลูกค้าสแกนหรือกรอกหน้าแคชเชียร์
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">จำนวนแต้มต่อครั้ง</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={rewardPoints || ""}
                      onChange={(e) => setRewardPoints(Number(e.target.value))}
                      className="w-24 rounded-xl glass-input px-3 py-2 text-sm font-semibold text-center text-amber-300 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      {[1, 2, 5].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setRewardPoints(pts)}
                          className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition ${
                            rewardPoints === pts
                              ? "bg-amber-400/15 border-amber-400/40 text-amber-300"
                              : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                          }`}
                        >
                          {pts}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePinAndLink}
                  className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-xs transition"
                >
                  สร้าง PIN + QR
                </button>
              </div>

              {/* Generated Result */}
              {generatedPin && (
                <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/8 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-500">รหัส PIN</span>
                      <div className="text-2xl font-mono font-bold text-amber-300 tracking-wider">
                        {generatedPin}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] border border-amber-400/30 text-amber-400 px-2 py-0.5 rounded-full">
                        {rewardPoints} แต้ม
                      </span>
                      <Link
                        href={`/reward_points?pin=${generatedPin}&demo=true`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-400 text-xs transition"
                      >
                        ทดสอบ PIN นี้
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-5 items-start">
                    <div className="flex-1 w-full space-y-2">
                      <label className="block text-[10px] text-slate-500">ลิงก์สำหรับแนบใน QR Code</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedLink}
                          className="flex-1 rounded-xl glass-input px-3 py-2 text-xs text-slate-300 font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-3.5 py-2 rounded-xl bg-white text-slate-950 text-xs font-medium hover:bg-slate-100 transition shrink-0"
                        >
                          {copyStatus === "success" ? "✓ คัดลอก" : "คัดลอก"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-600">
                        ลูกค้าที่เปิดลิงก์นี้จะได้รับ {rewardPoints} แต้มโดยอัตโนมัติ
                      </p>
                    </div>

                    <div className="flex flex-col items-center shrink-0">
                      <div className="bg-white p-3 rounded-xl shadow-lg">
                        <QRCode value={generatedLink || "https://storecafe.demo"} size={110} />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5">QR Code</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Info */}
            <div className="w-full lg:w-64 rounded-xl border border-white/10 bg-white/3 p-4 space-y-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-xs font-bold text-indigo-300">
                  {(adminUser.displayName || "A").charAt(0)}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">Points Manager</h3>
                  <p className="text-[10px] text-slate-500">ระบบควบคุมส่วนกลาง</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                โหมด Demo — สร้าง PIN เพิ่ม-หักแต้ม และดูประวัติได้เลย ไม่ต้องต่อฐานข้อมูล
              </p>
            </div>
          </div>

          {/* PIN History */}
          <div className="mt-5 border-t border-white/8 pt-4">
            <h3 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
              ประวัติ PIN ล่าสุด ({adminPins.length})
            </h3>
            {adminPins.length === 0 ? (
              <p className="text-xs text-slate-600">ยังไม่มีประวัติ</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {adminPins.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-mono font-semibold text-amber-300">#{p.pin}</div>
                      <div className="text-[10px] text-slate-500">
                        {p.points} แต้ม · {formatDateTime(p.createdAt)}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        p.used
                          ? "bg-white/5 text-slate-500"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-400/20"
                      }`}
                    >
                      {p.used ? "ใช้แล้ว" : "พร้อมใช้"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Customer Table */}
        <section className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                รายชื่อลูกค้า ({filteredUsers.length})
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                ค้นหา ปรับแต้ม และดูประวัติการใช้งาน
              </p>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, เบอร์, อีเมล..."
              className="w-full md:w-72 rounded-xl glass-input px-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-y-1.5">
              <thead>
                <tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left px-4 py-2">ลูกค้า</th>
                  <th className="text-left px-4 py-2">เบอร์</th>
                  <th className="text-center px-4 py-2">แต้ม</th>
                  <th className="text-left px-4 py-2">ปรับแต้ม</th>
                  <th className="text-center px-4 py-2">ประวัติ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-600 py-8 text-xs">
                      ไม่พบข้อมูลลูกค้า
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const delta = adjustInputs[u.uid] ?? 1;
                    const isSelf = u.uid === "demo-cust-001";

                    return (
                      <tr
                        key={u.uid}
                        className={`rounded-xl border transition ${
                          isSelf
                            ? "bg-indigo-950/20 border-indigo-500/20"
                            : "bg-white/3 border-white/8 hover:border-white/15"
                        }`}
                      >
                        <td className="px-4 py-3 rounded-l-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-xs font-semibold text-amber-300 shrink-0">
                              {(u.displayName || "U").charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-white flex items-center gap-1">
                                {u.displayName || "-"}
                                {isSelf && (
                                  <span className="text-[9px] bg-amber-400/10 text-amber-400 px-1.5 rounded-full border border-amber-400/20">
                                    Demo
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {u.phone || "-"}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 font-semibold text-amber-300 text-[11px]">
                            {u.points}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={delta}
                              onChange={(e) => handleChangeAdjust(u.uid, e.target.value)}
                              className="w-12 rounded-lg glass-input px-2 py-1 text-xs text-center text-amber-300 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAdjustPoints(u, "add")}
                              disabled={adjustingUserId === u.uid}
                              className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/20 text-emerald-400 text-[11px] font-medium transition disabled:opacity-50"
                            >
                              + เพิ่ม
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustPoints(u, "subtract")}
                              disabled={adjustingUserId === u.uid}
                              className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 text-red-400 text-[11px] font-medium transition disabled:opacity-50"
                            >
                              − หัก
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center rounded-r-xl">
                          <button
                            type="button"
                            onClick={() => openLogsModal(u)}
                            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-[11px] transition"
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

      {/* Logs Modal */}
      {logsModalUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={closeLogsModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-6 shadow-2xl text-white max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">ประวัติการได้แต้ม / ใช้สิทธิ์</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {logsModalUser.displayName} ({logsModalUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={closeLogsModal}
                className="text-slate-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 mb-4 text-xs">
              {(["all", "earn", "redeem", "admin"] as const).map((f) => {
                const labels = { all: "ทั้งหมด", earn: "ได้รับ", redeem: "แลก", admin: "แอดมิน" };
                return (
                  <button
                    key={f}
                    onClick={() => setLogsFilter(f)}
                    className={`px-3 py-1 rounded-full border transition ${
                      logsFilter === f
                        ? "bg-white/10 border-white/20 text-white font-medium"
                        : "border-white/8 text-slate-500 hover:bg-white/5"
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>

            {loadingLogs ? (
              <p className="text-xs text-slate-500 py-4 text-center">กำลังโหลด...</p>
            ) : filteredLogsForModal.length === 0 ? (
              <p className="text-xs text-slate-600 py-6 text-center">ไม่พบประวัติในหมวดหมู่นี้</p>
            ) : (
              <div className="space-y-2">
                {filteredLogsForModal.map((log) => {
                  const isPositive = log.delta > 0;
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 p-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-slate-200">
                          {log.note || (log.type === "redeem" ? "แลกรางวัล" : "รับแต้ม")}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatDateTime(log.createdAt)} · {log.source || "-"}
                        </div>
                      </div>
                      <div
                        className={`font-semibold text-sm ${
                          isPositive ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {isPositive ? `+${log.delta}` : log.delta}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#090d16]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
