"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type LoginIndexDoc = {
  email?: string;
  uid?: string;
};

// แปลง key ให้เป็นรูปแบบมาตรฐาน (สำหรับชื่อผู้ใช้)
const normalizeKey = (s: string) => s.trim().toLowerCase();

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(""); // อีเมล / ชื่อผู้ใช้ / เบอร์โทร
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const id = identifier.trim();
    if (!id || !password) {
      setError("กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่าน");
      return;
    }

    try {
      setLoading(true);

      let emailToLogin = id;

      // ถ้าไม่มี @ ให้ถือว่าเป็นชื่อผู้ใช้หรือเบอร์โทร → ไปหาใน login_index
      if (!id.includes("@")) {
        const key = normalizeKey(id);
        const idxRef = doc(db, "login_index", key);
        const idxSnap = await getDoc(idxRef);

        if (!idxSnap.exists()) {
          setError("ไม่พบบัญชีผู้ใช้จากชื่อผู้ใช้/เบอร์นี้");
          setLoading(false);
          return;
        }

        const data = idxSnap.data() as LoginIndexDoc;
        if (!data.email) {
          setError("ข้อมูลผู้ใช้ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ");
          setLoading(false);
          return;
        }

        emailToLogin = data.email;
      }

      // ล็อกอินด้วยอีเมล (มาจาก input ตรง ๆ หรือจาก login_index)
      const cred = await signInWithEmailAndPassword(
        auth,
        emailToLogin.trim(),
        password
      );

      const uid = cred.user.uid;
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      let role: string = "user";
      if (userSnap.exists()) {
        const data = userSnap.data() as { role?: string };
        role = data.role || "user";
      }

      // ส่งไปหน้า admin หรือหน้าแต้มสะสมตาม role
      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/reward_points");
      }
    } catch (err: any) {
      console.log("Login error:", err);
      setError("ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูลอีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden px-4">
      {/* แบ็กกราวด์แบบ Liquid Glass */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-64 w-64 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute top-1/2 -right-32 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      {/* การ์ดล็อกอินแบบ glass */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_20px_80px_rgba(15,23,42,0.9)] p-7 md:p-8 text-white">
          {/* ส่วนหัว */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center mb-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-400 via-emerald-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/40">
                <span className="text-lg font-bold">P</span>
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              เข้าสู่ระบบสะสมแต้ม
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-200/80">
              ใช้อีเมล, ชื่อผู้ใช้ หรือเบอร์โทรที่ลงทะเบียนไว้ในการเข้าสู่ระบบ
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/15 border border-red-400/60 text-red-100 px-3 py-2 text-xs md:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1 text-slate-100">
                อีเมล หรือชื่อผู้ใช้ / เบอร์โทร
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="เช่น ph หรือ 063xxxxxxx หรือ email@email.com"
                className="w-full rounded-xl border border-white/15 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1 text-slate-100">
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/15 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/40 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs md:text-sm text-slate-200/80">
            ยังไม่มีบัญชี?{" "}
            <a
              href="/register"
              className="font-medium text-sky-300 hover:text-sky-200 hover:underline"
            >
              สมัครสมาชิก
            </a>
          </p>
        </div>

        {/* ข้อความเล็ก ๆ ข้างล่าง */}
        <p className="mt-3 text-center text-[11px] text-slate-300/70">
          Points Loyalty – ระบบสะสมแต้มสำหรับร้านค้า &amp; ลูกค้าประจำ
        </p>
      </div>
    </main>
  );
}
