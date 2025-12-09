"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type LoginIndexDoc = {
  email?: string;
  uid?: string;
};

// ใช้รูปแบบเดียวกับหน้า login
const normalizeKey = (s: string) => s.trim().toLowerCase();
const normalizePhone = (s: string) => s.replace(/\s+/g, "");

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
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

    try {
      setLoading(true);

      const usernameKey = normalizeKey(uname);
      const phoneKey = normalizePhone(phoneRaw);

      // เช็คว่าชื่อผู้ใช้ถูกใช้ไปแล้วหรือยัง
      const usernameIdxRef = doc(db, "login_index", usernameKey);
      const usernameIdxSnap = await getDoc(usernameIdxRef);
      if (usernameIdxSnap.exists()) {
        const exist = usernameIdxSnap.data() as LoginIndexDoc;
        setError(
          `ชื่อผู้ใช้ "${uname}" มีผู้ใช้งานแล้ว หรือ อีเมล "${email}" มีผู้ใช้งานแล้ว )`
        );
        setLoading(false);
        return;
      }

      // เช็คว่าเบอร์โทรถูกใช้ไปแล้วหรือยัง
      const phoneIdxRef = doc(db, "login_index", phoneKey);
      const phoneIdxSnap = await getDoc(phoneIdxRef);
      if (phoneIdxSnap.exists()) {
        const exist = phoneIdxSnap.data() as LoginIndexDoc;
        setError(
          `เบอร์โทร "${phoneRaw}" มีผู้ใช้งานแล้ว (เชื่อมกับอีเมล ${exist.email || "-"} )`
        );
        setLoading(false);
        return;
      }

      // สร้างบัญชีใน Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, mail, password);

      // ใช้ "ชื่อผู้ใช้" เป็นชื่อที่แสดง
      const nameForDisplay = uname;
      await updateProfile(cred.user, {
        displayName: nameForDisplay,
      });

      const uid = cred.user.uid;

      // บันทึกข้อมูลลง users/{uid}
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        uid,
        displayName: nameForDisplay, // แสดงชื่อจาก username
        username: uname,
        phone: phoneRaw,
        email: mail,
        points: 0,
        role: "user",
        createdAt: serverTimestamp(),
      });

      // สร้าง index สำหรับล็อกอินด้วย username
      await setDoc(usernameIdxRef, {
        uid,
        email: mail,
      });

      // และด้วยเบอร์โทร
      await setDoc(phoneIdxRef, {
        uid,
        email: mail,
      });

      // สมัครเสร็จ → ไปหน้าแต้มสะสม
      router.push("/reward_points");
    } catch (err: any) {
      console.log("Register error:", err);
      if (err?.code === "auth/email-already-in-use") {
        setError("อีเมลนี้มีบัญชีใช้งานอยู่แล้ว");
      } else if (err?.code === "auth/invalid-email") {
        setError("รูปแบบอีเมลไม่ถูกต้อง");
      } else {
        setError("ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden px-4">
      {/* Liquid Glass background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute top-10 right-[-4rem] h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-2xl shadow-[0_20px_80px_rgba(15,23,42,0.9)] p-7 md:p-8 text-white">
          {/* header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center mb-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-400 via-emerald-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/40">
                <span className="text-lg font-bold">P</span>
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              สมัครสมาชิกใหม่
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-200/80">
              สร้างบัญชีเพื่อเริ่มสะสมแต้มกับร้านโปรดของคุณ
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
                ชื่อผู้ใช้
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ใช้สำหรับล็อกอิน เช่น ph"
                className="w-full rounded-xl border border-white/15 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
              />
              <p className="text-[11px] text-slate-200/70 mt-1">
                ระบบไม่สนใจตัวพิมพ์เล็ก/ใหญ่ (PH กับ ph ถือว่าเหมือนกัน)
              </p>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1 text-slate-100">
                เบอร์โทร
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 0637513276"
                className="w-full rounded-xl border border-white/15 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1 text-slate-100">
                อีเมล
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="เช่น example@mail.com"
                className="w-full rounded-xl border border-white/15 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1 text-slate-100">
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
                />
                <p className="text-[11px] text-slate-200/70 mt-1">
                  อย่างน้อย 6 ตัวอักษร
                </p>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium mb-1 text-slate-100">
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/40 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs md:text-sm text-slate-200/80">
            มีบัญชีอยู่แล้ว?{" "}
            <a
              href="/login"
              className="font-medium text-sky-300 hover:text-sky-200 hover:underline"
            >
              เข้าสู่ระบบ
            </a>
          </p>
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-300/70">
          Points Loyalty – เริ่มต้นสะสมแต้มได้ง่าย ๆ แค่สมัครสมาชิก
        </p>
      </div>
    </main>
  );
}
