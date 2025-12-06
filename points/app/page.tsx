export default function HomePage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 text-white px-4">
      {/* แบ็กกราวด์แบบ Liquid / Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-64 w-64 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute top-1/2 -right-32 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      {/* การ์ดหลักแบบ Glass */}
      <section className="relative z-10 w-full max-w-xl">
        <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_20px_80px_rgba(15,23,42,0.9)] p-7 md:p-9">
          {/* Logo / ชื่อระบบ */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400 via-emerald-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/40">
                <span className="text-lg font-bold">P</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  Points Loyalty
                </h1>
                <p className="text-xs md:text-sm text-slate-200/80">
                  ระบบสะสมแต้มสำหรับร้านกาแฟ/ร้านค้าเล็ก ๆ
                </p>
              </div>
            </div>

            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
              Beta
            </span>
          </div>

          {/* คำอธิบาย + จุดเด่น */}
          <p className="text-sm md:text-[15px] text-slate-100/90 mb-4">
            ให้ลูกค้าสแกนรับแต้ม ตรวจสอบยอดสะสม และแลกรางวัลได้เอง
            ส่วนแอดมินจัดการแต้มและดูประวัติการใช้งานได้แบบเรียลไทม์
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 text-xs md:text-[13px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                สำหรับร้านค้า
              </div>
              <ul className="space-y-1 text-slate-100/80">
                <li>• สร้าง PIN / QR ให้ลูกค้าสแกนรับแต้ม</li>
                <li>• ปรับเพิ่ม–หักแต้ม และดูประวัติ</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                สำหรับลูกค้า
              </div>
              <ul className="space-y-1 text-slate-100/80">
                <li>• ดูแต้มสะสมแบบสแตมป์การ์ด</li>
                <li>• ใช้แต้มแลกรางวัล และดูประวัติการใช้สิทธิ์</li>
              </ul>
            </div>
          </div>

          {/* ปุ่ม CTA */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex gap-3">
              <a
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 px-5 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/40 hover:opacity-95 transition"
              >
                สมัครสมาชิก
              </a>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-sky-400/70 bg-slate-900/40 px-5 py-2 text-sm font-medium text-sky-100 hover:bg-slate-900/70 transition"
              >
                เข้าสู่ระบบ
              </a>
            </div>

            <p className="text-[11px] text-slate-200/70 mt-1 md:mt-0">
              มีบัญชีแอดมินอยู่แล้ว? เข้าสู่ระบบเพื่อจัดการแต้มของลูกค้า
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
