"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDemo } from "@/lib/demo-context";
import DemoBar from "@/components/DemoBar";

function formatThaiDateTime(ts: any) {
  if (!ts) return "-";
  if (typeof ts === "string") return ts;
  return "-";
}

export default function RewardPointsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    customerUser,
    customerRedeemLogs,
    claimPin,
    redeemReward,
    addCustomerPoints,
  } = useDemo();

  const [mounted, setMounted] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemConfirmOpen, setRedeemConfirmOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const pinFromQuery = searchParams.get("pin");
    if (pinFromQuery) {
      setPinInput(pinFromQuery);
      setPinModalOpen(true);
    }
  }, [searchParams]);

  const handleSignOut = () => {
    router.push("/");
  };

  const currentPoints = customerUser.points;
  const currentDisplayName = customerUser.displayName;
  const currentPhone = customerUser.phone;
  const currentEmail = customerUser.email;

  const stampsPerReward = 10;
  const stampsInCurrentCycle = currentPoints % stampsPerReward;
  const stampsFilled =
    currentPoints >= stampsPerReward && stampsInCurrentCycle === 0
      ? stampsPerReward
      : stampsInCurrentCycle;
  const stampsRemaining = Math.max(0, stampsPerReward - stampsFilled);
  const canRedeem = currentPoints >= stampsPerReward;

  const handleSubmitPin = (e: FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinMessage(null);

    const pin = pinInput.trim();
    if (!pin) {
      setPinError("กรุณากรอกรหัส PIN");
      return;
    }

    setPinLoading(true);
    setTimeout(() => {
      const res = claimPin(pin);
      if (res.success) {
        setPinMessage(res.message);
        setPinInput("");
      } else {
        setPinError(res.message);
      }
      setPinLoading(false);
    }, 250);
  };

  const handleRedeem = () => {
    setRedeemError(null);
    setRedeemMessage(null);

    if (!canRedeem) {
      setRedeemError("แต้มสะสมยังไม่ครบ 10 แต้ม");
      return;
    }

    setRedeemLoading(true);
    setTimeout(() => {
      const res = redeemReward();
      if (res.success) {
        setRedeemMessage(res.message);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 4000);
      } else {
        setRedeemError(res.message);
      }
      setRedeemLoading(false);
    }, 300);
  };

  return (
    <main className="relative min-h-screen flex flex-col bg-[#090d16] text-white overflow-hidden pb-12">
      <DemoBar currentRole="customer" />

      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-40 w-full border-b border-white/8 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0F172A">
                <path d="M12 2L14.4 9H22L15.8 13.5L18.2 20.5L12 16L5.8 20.5L8.2 13.5L2 9H9.6Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Points</h1>
              <p className="text-[10px] text-slate-500">{currentDisplayName}</p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setPinMessage(null);
                setPinError(null);
                setPinModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition"
            >
              ใส่ PIN
            </button>
            <Link
              href="/scan"
              className="px-3.5 py-2 rounded-lg text-slate-400 hover:text-white text-xs transition"
            >
              สแกน QR
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

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-6 space-y-5 w-full">
        {/* Profile Card */}
        <section className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-300 text-base font-bold">
                {currentDisplayName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">{currentDisplayName}</h2>
                  <span className="text-[10px] text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full">
                    Gold
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 mt-0.5">
                  <span>{currentPhone}</span>
                  <span>·</span>
                  <span>{currentEmail}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t sm:border-t-0 border-white/8 pt-3 sm:pt-0">
              <div className="text-right">
                <p className="text-[10px] text-slate-500">แต้มสะสมทั้งหมด</p>
                <div className="inline-flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-bold gold-gradient-text">
                    {mounted ? currentPoints : "-"}
                  </span>
                  <span className="text-xs text-slate-400">แต้ม</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => addCustomerPoints(1)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition"
                title="ทดสอบเพิ่มแต้ม"
              >
                +1
              </button>
            </div>
          </div>
        </section>

        {/* Celebration Banner */}
        {showCelebration && (
          <div className="glass-panel rounded-2xl p-5 border border-emerald-400/30 bg-emerald-950/30 text-center">
            <h3 className="text-sm font-semibold text-emerald-300">
              ยินดีด้วย! แลกรับเครื่องดื่มฟรีสำเร็จแล้ว
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              แสดงข้อความนี้แก่พนักงานที่เคาน์เตอร์
            </p>
          </div>
        )}

        {/* Stamp Card */}
        <section className="flex justify-center">
          <div className="w-full max-w-lg coffee-card-texture rounded-2xl p-6 border border-amber-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 shimmer-bg pointer-events-none opacity-30" />

            {/* Card Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/8 pb-4 mb-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Points Loyalty Pass</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">สะสมครบ 10 แต้ม แลกรับเครื่องดื่มฟรี</p>
              </div>
              <span className="text-[10px] text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                STAMP CARD
              </span>
            </div>

            {/* Stamp Grid */}
            <div className="relative z-10 grid grid-cols-5 gap-2.5 justify-items-center my-5">
              {Array.from({ length: 10 }).map((_, index) => {
                const isStamped = index < stampsFilled;
                const isTenth = index === 9;

                return (
                  <div
                    key={index}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isStamped
                        ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30"
                        : isTenth
                        ? "border border-dashed border-amber-400/40 bg-amber-400/5"
                        : "border border-white/10 bg-white/5"
                    }`}
                  >
                    {isStamped ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : isTenth ? (
                      <span className="text-[10px] text-amber-400 font-medium">ฟรี</span>
                    ) : (
                      <span className="text-xs text-slate-600">{index + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress */}
            <div className="relative z-10 border-t border-white/8 pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
                <span>
                  รอบนี้ <strong className="text-white">{stampsFilled}/10</strong> แต้ม
                </span>
                <span>
                  {canRedeem ? (
                    <span className="text-emerald-400 font-medium">พร้อมแลกรางวัล</span>
                  ) : (
                    `อีก ${stampsRemaining} แต้ม`
                  )}
                </span>
              </div>

              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                  style={{ width: `${(stampsFilled / 10) * 100}%` }}
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  disabled={!canRedeem || redeemLoading}
                  onClick={() => setRedeemConfirmOpen(true)}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    canRedeem
                      ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                      : "bg-white/5 border border-white/8 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {canRedeem
                    ? "แลกรับเครื่องดื่มฟรี"
                    : `สะสมอีก ${stampsRemaining} แต้มเพื่อแลกรางวัล`}
                </button>
              </div>

              {redeemMessage && (
                <p className="text-xs text-emerald-400 text-center">{redeemMessage}</p>
              )}
              {redeemError && (
                <p className="text-xs text-red-400 text-center">{redeemError}</p>
              )}
            </div>
          </div>
        </section>

        {/* Demo Help */}
        <section className="glass-card rounded-2xl p-4 border border-white/8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-medium text-slate-300">ทดสอบโหมด Demo</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                กรอก PIN{" "}
                <code className="text-amber-400 bg-black/30 px-1 rounded">999999</code>{" "}
                เพื่อรับ +1 แต้ม หรือกด +1 ด้านบนได้เลย
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPinInput("999999");
                  setPinModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs transition"
              >
                ทดสอบ PIN 999999
              </button>
              <Link
                href="/admin?demo=true"
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs transition"
              >
                หน้าแอดมิน
              </Link>
            </div>
          </div>
        </section>

        {/* Redemption History */}
        <section className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">ประวัติการแลกรางวัล</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">บันทึกการใช้แต้มสะสมแลกรับของสมนาคุณ</p>
            </div>
            <span className="text-xs text-slate-500">{customerRedeemLogs.length} รายการ</span>
          </div>

          {customerRedeemLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs">
              <p>ยังไม่มีประวัติการแลกรางวัล</p>
              <p className="text-[11px] mt-1 text-slate-600">
                เมื่อสะสมครบ 10 แต้มและกดแลกรับ รายการจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {customerRedeemLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:border-white/15 transition"
                >
                  <div>
                    <div className="text-xs font-medium text-slate-200">
                      {log.note || "แลกรับเครื่องดื่มฟรี (ครบ 10 แต้ม)"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {formatThaiDateTime(log.createdAt)}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-amber-400">{log.delta} แต้ม</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* PIN Modal */}
      {pinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => {
            setPinModalOpen(false);
            setPinError(null);
            setPinMessage(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-6 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">ใส่ PIN รับแต้มสะสม</h2>
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="text-slate-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              กรอกรหัส PIN 6 หลักที่ได้รับจากพนักงานเพื่อเพิ่มแต้มเข้าบัญชี
            </p>

            {pinError && (
              <div className="mb-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-xs">
                {pinError}
              </div>
            )}
            {pinMessage && (
              <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 px-3 py-2 text-xs">
                {pinMessage}
              </div>
            )}

            <form onSubmit={handleSubmitPin} className="space-y-3">
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-xl glass-input px-4 py-3 text-center text-xl tracking-widest font-mono text-amber-300 placeholder:text-slate-600 focus:outline-none"
                autoFocus
              />

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>ทดสอบด่วน:</span>
                <button type="button" onClick={() => setPinInput("999999")} className="hover:text-slate-300 underline">
                  999999 (+1 แต้ม)
                </button>
                <button type="button" onClick={() => setPinInput("777888")} className="hover:text-slate-300 underline">
                  777888 (+3 แต้ม)
                </button>
              </div>

              <button
                type="submit"
                disabled={pinLoading}
                className="w-full rounded-xl bg-amber-400 text-slate-950 py-3 text-sm font-semibold hover:bg-amber-300 disabled:opacity-50 transition"
              >
                {pinLoading ? "กำลังตรวจสอบ..." : "ยืนยัน"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/scan"
                onClick={() => setPinModalOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-300 transition"
              >
                หรือเปิดกล้องสแกน QR Code →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Redeem Modal */}
      {redeemConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setRedeemConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950/95 backdrop-blur-2xl p-6 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-white">ยืนยันการแลกรางวัล</h2>
              <p className="text-xs text-slate-400 mt-1">
                ใช้ <strong className="text-white">10 แต้ม</strong> แลกรับเครื่องดื่มฟรี 1 แก้ว
              </p>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/8 p-3 mb-5 text-xs text-slate-400 text-center">
              แต้มปัจจุบัน: <strong className="text-white">{currentPoints}</strong> → คงเหลือ{" "}
              <strong className="text-white">{currentPoints - 10}</strong> แต้ม
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRedeemConfirmOpen(false)}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 py-2.5 text-xs font-medium hover:bg-white/10 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setRedeemConfirmOpen(false);
                  handleRedeem();
                }}
                disabled={redeemLoading}
                className="flex-1 rounded-xl bg-amber-400 text-slate-950 py-2.5 text-xs font-semibold hover:bg-amber-300 disabled:opacity-50 transition"
              >
                {redeemLoading ? "กำลังบันทึก..." : "ยืนยันแลกรับ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
