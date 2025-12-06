"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

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
          `ชื่อผู้ใช้ "${uname}" มีผู้ใช้งานแล้ว (เชื่อมกับอีเมล ${exist.email || "-"} )`
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white shadow-md rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">สมัครสมาชิก</h1>

        {error && (
          <div className="mb-3 rounded-md bg-red-100 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">ชื่อผู้ใช้</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ใช้สำหรับล็อกอิน เช่น ph"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              ระบบจะถือว่าไม่สนใจตัวพิมพ์เล็ก/ใหญ่ (PH กับ ph เหมือนกัน)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">เบอร์โทร</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 0637513276"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="เช่น example@mail.com"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              ยืนยันรหัสผ่าน
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-600 text-white py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          มีบัญชีอยู่แล้ว?{" "}
          <a href="/login" className="text-sky-600 hover:underline">
            เข้าสู่ระบบ
          </a>
        </p>
      </div>
    </div>
  );
}
