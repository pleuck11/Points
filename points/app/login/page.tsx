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
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white shadow-md rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">
          เข้าสู่ระบบสะสมแต้ม
        </h1>

        {error && (
          <div className="mb-3 rounded-md bg-red-100 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              อีเมล หรือชื่อผู้ใช้ / เบอร์โทร
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="เช่น ph หรือ 063xxxxxxx หรือ email@email.com"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-600 text-white py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? "กำลังกำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          ยังไม่มีบัญชี?{" "}
          <a href="/register" className="text-sky-600 hover:underline">
            สมัครสมาชิก
          </a>
        </p>
      </div>
    </div>
  );
}
