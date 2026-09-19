"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDemo } from "@/lib/demo-context";

export default function RegisterPage() {
  const router = useRouter();
  const { customerUser } = useDemo();

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const uname = username.trim();
    const phoneRaw = phone.trim();
    const mail = email.trim();

    if (!uname || !phoneRaw || !mail || !password || !confirmPassword) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      router.push("/reward_points?demo=true");
      setLoading(false);
    }, 350);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#090d16] text-white overflow-hidden px-4 py-8">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute top-10 right-[-4rem] h-80 w-80 rounded-full bg-indigo-600/10 blur-[140px]" />
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
            <h1 className="text-xl font-bold tracking-tight text-white">สมัครสมาชิก</h1>
            <p className="mt-1 text-xs text-slate-500">รับสแตมป์การ์ดดิจิทัลและเริ่มสะสมแต้มกับเรา</p>
          </div>

          {/* Quick Demo */}
          <div className="mb-5 rounded-xl border border-white/8 bg-white/3 p-3 text-center space-y-2">
            <p className="text-[10px] text-slate-500">อยากลองดูก่อน?</p>
            <Link
              href="/reward_points?demo=true"
              className="inline-block py-1.5 px-4 rounded-xl bg-amber-400 text-slate-950 text-xs font-semibold hover:bg-amber-300 transition"
            >
              ทดลองโหมด Demo ทันที
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3.5 py-2.5 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs text-slate-400 mb-1">ชื่อผู้ใช้</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น somchai"
                className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="0891234567"
                className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัว"
                  className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">ยืนยันรหัสผ่าน</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="ยืนยันอีกครั้ง"
                  className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl bg-amber-400 hover:bg-amber-300 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60 transition"
            >
              {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500 space-y-1.5">
            <p>
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/login" className="text-amber-400 hover:text-amber-300">
                เข้าสู่ระบบ
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
