"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDemo } from "@/lib/demo-context";

export default function LoginPage() {
  const router = useRouter();
  const { customerUser } = useDemo();
  const [identifier, setIdentifier] = useState("customer.demo@storecafe.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (identifier.toLowerCase().includes("admin")) {
        router.push("/admin?demo=true");
      } else {
        router.push("/reward_points?demo=true");
      }
      setLoading(false);
    }, 300);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#090d16] text-white overflow-hidden px-4 py-8">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 h-80 w-80 rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel rounded-2xl p-7 sm:p-8 shadow-xl border border-white/10">
          {/* Header */}
          <div className="mb-6 text-center">
            <Link href="/" className="inline-flex items-center justify-center mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0F172A">
                  <path d="M12 2L14.4 9H22L15.8 13.5L18.2 20.5L12 16L5.8 20.5L8.2 13.5L2 9H9.6Z" />
                </svg>
              </div>
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-white">เข้าสู่ระบบ</h1>
            <p className="mt-1 text-xs text-slate-500">Points — ระบบสะสมแต้ม</p>
          </div>

          {/* Quick Demo Buttons */}
          <div className="mb-6 rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
            <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider mb-1">
              ทดลองใช้งานใน 1 คลิก
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/reward_points?demo=true"
                className="py-2.5 px-3 rounded-xl bg-amber-400 text-slate-950 text-xs font-semibold hover:bg-amber-300 transition text-center"
              >
                หน้าลูกค้า
              </Link>
              <Link
                href="/admin?demo=true"
                className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium hover:bg-white/10 transition text-center"
              >
                หน้าแอดมิน
              </Link>
            </div>
            <p className="text-[10px] text-slate-600 text-center">
              ไม่ต้องสมัครหรือเชื่อมต่อฐานข้อมูล
            </p>
          </div>

          <div className="relative flex py-1 items-center mb-5">
            <div className="flex-grow border-t border-white/8" />
            <span className="flex-shrink mx-3 text-[10px] text-slate-600 uppercase tracking-wider">
              หรือเข้าสู่ระบบผ่านฟอร์ม
            </span>
            <div className="flex-grow border-t border-white/8" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                อีเมล, ชื่อผู้ใช้ หรือเบอร์โทร
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60 transition"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500 space-y-1.5">
            <p>
              ยังไม่มีบัญชี?{" "}
              <Link href="/register" className="text-amber-400 hover:text-amber-300">
                สมัครสมาชิก
              </Link>
            </p>
            <p>
              <Link href="/" className="text-slate-600 hover:text-slate-400">
                ← กลับหน้าหลัก
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
