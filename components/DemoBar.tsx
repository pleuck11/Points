"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo-context";

interface DemoBarProps {
  currentRole: "customer" | "admin";
}

export default function DemoBar({ currentRole }: DemoBarProps) {
  const router = useRouter();
  const { isDemo, setIsDemo, customerUser, addCustomerPoints, claimPin, resetDemoData } = useDemo();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (!isDemo) return null;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs shadow-xl border border-white/10">
          {toast}
        </div>
      )}

      {/* Demo Bar */}
      <div className="sticky top-0 z-50 w-full bg-slate-900/95 border-b border-white/8 backdrop-blur-md px-4 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left */}
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
            </span>
            <span className="font-medium text-slate-300 text-[11px]">Points Demo</span>
            <span className="hidden sm:inline text-slate-600 text-[11px]">
              · ทดลองฟังก์ชันได้ทันทีโดยไม่ต้องเชื่อมฐานข้อมูล
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5">
              <div className="inline-flex rounded-lg border border-white/8 overflow-hidden">
              <Link
                href="/reward_points?demo=true"
                className={`px-3 py-1.5 text-[11px] font-medium transition ${
                  currentRole === "customer"
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                ลูกค้า
              </Link>
              <Link
                href="/admin?demo=true"
                className={`px-3 py-1.5 text-[11px] font-medium transition ${
                  currentRole === "admin"
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Admin
              </Link>
            </div>

            {currentRole === "customer" && (
              <button
                type="button"
                onClick={() => {
                  addCustomerPoints(1, "กดรับแต้มทดสอบด่วน (+1 แต้ม)");
                  showToast("+1 แต้มเรียบร้อย");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 text-amber-400 text-[11px] font-medium hidden sm:inline-flex transition"
              >
                +1 แต้ม
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (confirm("รีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้น?")) {
                  resetDemoData();
                  showToast("รีเซ็ตเรียบร้อย");
                }
              }}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 text-[11px] transition"
            >
              รีเซ็ต
            </button>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 text-[11px] font-medium transition"
            >
              หน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
