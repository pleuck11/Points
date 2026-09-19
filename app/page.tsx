"use client";

import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const [stampPreviewCount, setStampPreviewCount] = useState(7);

  return (
    <main className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#090d16] text-white">
      {/* Subtle ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[160px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-20 w-full border-b border-white/8 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0F172A">
                <path d="M12 2L14.4 9H22L15.8 13.5L18.2 20.5L12 16L5.8 20.5L8.2 13.5L2 9H9.6Z" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">Points</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
              Demo
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/admin?demo=true"
              className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              หลังร้าน
            </Link>
            <Link
              href="/reward_points?demo=true"
              className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 text-xs font-semibold hover:bg-amber-300 transition"
            >
              ทดลองใช้งาน
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Content Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-24 w-full">
        {/* Headline */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs text-amber-400 tracking-widest uppercase mb-4 font-medium">
            Digital Loyalty System
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-5">
            ระบบสะสมแต้ม{" "}
            <span className="gold-gradient-text">สแตมป์การ์ด</span>
            <br />
            สำหรับร้านกาแฟ
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
            แทนที่บัตรกระดาษด้วยสแตมป์การ์ดดิจิทัล ลูกค้าสะสมแต้มผ่าน QR Code
            พร้อมแดชบอร์ดจัดการหลังร้านแบบครบวงจร
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/reward_points?demo=true"
              className="px-6 py-3 rounded-xl bg-amber-400 text-slate-950 font-semibold text-sm hover:bg-amber-300 transition"
            >
              มุมมองลูกค้า →
            </Link>
            <Link
              href="/admin?demo=true"
              className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition"
            >
              ระบบหลังร้าน
            </Link>
            <Link
              href="/scan"
              className="px-5 py-3 rounded-xl text-slate-400 hover:text-white text-sm transition"
            >
              จำลองสแกน QR
            </Link>
          </div>
        </div>

        {/* Live Interactive Card Demo */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="glass-panel rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Left: Description */}
              <div className="flex-1 space-y-4">
                <p className="text-[10px] text-emerald-400 tracking-widest uppercase font-medium">
                  Live Preview
                </p>
                <h2 className="text-lg font-semibold text-white">
                  ทดลองสแตมป์การ์ดแบบเรียลไทม์
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  กดปุ่มด้านล่างเพื่อดูการเปลี่ยนแปลงของสแตมป์การ์ด
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStampPreviewCount((c) => Math.min(10, c + 1))}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-medium transition"
                  >
                    + เพิ่มแต้ม
                  </button>
                  <button
                    type="button"
                    onClick={() => setStampPreviewCount((c) => Math.max(0, c - 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 text-xs transition"
                  >
                    − ลดแต้ม
                  </button>
                  <button
                    type="button"
                    onClick={() => setStampPreviewCount(10)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-400 text-xs font-medium transition"
                  >
                    ครบ 10
                  </button>
                </div>

                <Link
                  href="/reward_points?demo=true"
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 pt-1"
                >
                  เปิดหน้าแอปลูกค้าแบบเต็มจอ →
                </Link>
              </div>

              {/* Right: Card Preview */}
              <div className="w-full md:w-72">
                <div className="coffee-card-texture rounded-2xl p-5 border border-white/10">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="text-xs font-semibold text-white">Points</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Loyalty Card</div>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full">
                      VIP
                    </span>
                  </div>

                  {/* Stamp Grid */}
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const isStamped = i < stampPreviewCount;
                      return (
                        <div
                          key={i}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isStamped
                              ? "bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/30"
                              : "border border-white/10 bg-white/5"
                          }`}
                        >
                          {isStamped ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className="text-[10px] text-slate-600">{i + 1}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-white/8">
                    <p className="text-[11px] text-slate-400 text-center">
                      {stampPreviewCount >= 10 ? (
                        <span className="text-emerald-400 font-medium">ครบ 10 แต้ม — แลกรับฟรีได้เลย</span>
                      ) : (
                        `อีก ${10 - stampPreviewCount} แต้ม รับเครื่องดื่มฟรี 1 แก้ว`
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-2">สำหรับลูกค้า</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              ไม่ต้องโหลดแอป สแกน QR รับแต้ม ดูสแตมป์การ์ด และแลกรางวัลได้ทันที
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />
                ดูยอดแต้มและสแตมป์การ์ด
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />
                สแกน QR หรือใส่ PIN เพื่อรับแต้ม
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />
                แลกรางวัลและดูประวัติย้อนหลัง
              </li>
            </ul>
            <div className="mt-4">
              <Link href="/reward_points?demo=true" className="text-xs text-amber-400 hover:text-amber-300">
                ทดลองหน้านี้ →
              </Link>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-2">สำหรับเจ้าของร้าน</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              จัดการทุกอย่างจากแดชบอร์ดเดียว รวดเร็ว ปลอดภัย ไม่ยุ่งยาก
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-400 inline-block" />
                สร้าง PIN และ QR Code สำหรับหน้าร้าน
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-400 inline-block" />
                ค้นหาลูกค้าและดูข้อมูลสมาชิก
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-400 inline-block" />
                ปรับแต้มและตรวจสอบประวัติการใช้
              </li>
            </ul>
            <div className="mt-4">
              <Link href="/admin?demo=true" className="text-xs text-indigo-400 hover:text-indigo-300">
                ทดลองระบบหลังร้าน →
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="glass-card rounded-xl p-4">
            <div className="text-xl font-bold gold-gradient-text">10 แต้ม</div>
            <div className="text-[11px] text-slate-500 mt-1">แลกเครื่องดื่มฟรี</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-xl font-bold text-emerald-400">Web App</div>
            <div className="text-[11px] text-slate-500 mt-1">ไม่ต้องโหลดแอป</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-xl font-bold text-sky-400">Real-time</div>
            <div className="text-[11px] text-slate-500 mt-1">แต้มขึ้นทันที</div>
          </div>
          <div className="glass-card rounded-xl p-4">
            <div className="text-xl font-bold text-slate-300">Free Demo</div>
            <div className="text-[11px] text-slate-500 mt-1">ทดลองฟรี ไม่ต้องสมัคร</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-white/8 py-6 px-6 text-center text-xs text-slate-600">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Points — Loyalty System</p>
          <div className="flex items-center gap-4">
            <Link href="/reward_points?demo=true" className="hover:text-slate-400 transition">Customer Demo</Link>
            <span>·</span>
            <Link href="/admin?demo=true" className="hover:text-slate-400 transition">Admin Demo</Link>
            <span>·</span>
            <Link href="/scan" className="hover:text-slate-400 transition">Scan QR</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
