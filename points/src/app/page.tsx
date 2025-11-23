"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";

const phoneToEmail = (phone: string) => {
  const normalized = phone.replace(/\s+/g, "");
  return `${normalized}@points-app.local`;
};

export default function HomePage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!phone.trim()) {
        throw new Error("กรุณากรอกเบอร์โทร");
      }

      const email = phoneToEmail(phone);
      let uid: string; // ไว้เก็บ uid ของ user ที่ล็อกอิน/สมัคร

      if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
        }

        const userCred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        uid = userCred.user.uid;

        // สร้างข้อมูลผู้ใช้ใน Firestore (เริ่ม stamps = 0, isAdmin = false)
        await setDoc(doc(db, "users", uid), {
          phone: phone.trim(),
          address: address.trim(),
          stamps: 0,
          isAdmin: false,
          createdAt: serverTimestamp(),
        });
      } else {
        const userCred = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        uid = userCred.user.uid;
      }

      // อ่านข้อมูล user จาก Firestore เพื่อตรวจ isAdmin
      const userSnap = await getDoc(doc(db, "users", uid));
      const userData = userSnap.exists() ? (userSnap.data() as any) : null;
      const isAdmin = userData?.isAdmin === true;

      // ถ้าเป็น admin → ไป /admin, ถ้าไม่ใช่ → ไป /card
      if (isAdmin) {
        router.push("/admin");
      } else {
        router.push("/card");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-4">
          ระบบสะสมแต้ม (Points)
        </h1>

        <div className="flex justify-center gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              mode === "login"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
            onClick={() => setMode("login")}
            type="button"
          >
            เข้าสู่ระบบ
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              mode === "signup"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
            onClick={() => setMode("signup")}
            type="button"
          >
            สมัครสมาชิก
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* เบอร์โทร */}
          <div>
            <label className="block text-sm font-medium mb-1">
              เบอร์โทรศัพท์
            </label>
            <input
              type="tel"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="เช่น 0801234567"
            />
          </div>

          {/* ที่อยู่ (เฉพาะสมัคร) */}
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium mb-1">ที่อยู่</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required={mode === "signup"}
                placeholder="กรอกที่อยู่สำหรับออกใบเสร็จ/จัดส่ง"
                rows={3}
              />
            </div>
          )}

          {/* รหัสผ่าน */}
          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="อย่างน้อย 6 ตัวอักษร"
            />
          </div>

          {/* ยืนยันรหัสผ่าน */}
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                ยืนยันรหัสผ่าน
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required={mode === "signup"}
                minLength={6}
                placeholder="พิมพ์รหัสผ่านซ้ำอีกครั้ง"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-medium disabled:opacity-60"
          >
            {loading
              ? "กำลังดำเนินการ..."
              : mode === "login"
              ? "เข้าสู่ระบบด้วยเบอร์โทร"
              : "สมัครสมาชิกใหม่"}
          </button>
        </form>
      </div>
    </main>
  );
}
