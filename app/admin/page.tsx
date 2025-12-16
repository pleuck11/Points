"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  setDoc,
} from "firebase/firestore";
import QRCode from "react-qr-code";

/* =======================
   Types
======================= */
type UserRoleDoc = {
  role?: string;
  email?: string;
  displayName?: string | null;
  phone?: string;
  points?: number;
};

type AppUser = {
  uid: string;
  email: string;
  displayName: string | null;
  phone: string;
  points: number;
  role?: string;
};

type PointLog = {
  id: string;
  delta: number;
  type?: string;
  createdAt?: any;
  source?: string;
  adminEmail?: string | null;
};

type PinRecord = {
  id: string;
  pin: string;
  points: number;
  createdAt?: any;
  used?: boolean;
  usedAt?: any;
};

/* =======================
   Page
======================= */
export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [adjustInputs, setAdjustInputs] = useState<Record<string, number>>({});
  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  /* ===== PIN ===== */
  const [baseUrl, setBaseUrl] = useState("");
  const [rewardPoints, setRewardPoints] = useState<number>(1);
  const [generatedPin, setGeneratedPin] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const [pinHistory, setPinHistory] = useState<PinRecord[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);

  /* =======================
     Auth + Load users
  ======================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        router.push("/login");
        return;
      }

      setUser(fbUser);

      const snap = await getDoc(doc(db, "users", fbUser.uid));
      const data = snap.data() as UserRoleDoc | undefined;

      if (!data || data.role !== "admin") {
        router.push("/reward_points");
        return;
      }

      setRole("admin");

      const usersSnap = await getDocs(collection(db, "users"));
      const list: AppUser[] = usersSnap.docs.map((d) => {
        const u = d.data() as UserRoleDoc;
        return {
          uid: d.id,
          email: u.email || "",
          displayName: u.displayName ?? null,
          phone: u.phone || "",
          points: u.points ?? 0,
          role: u.role,
        };
      });

      setUsers(list);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  /* =======================
     Create PIN (METHOD 2)
  ======================= */
  const handleGeneratePin = async () => {
    if (!user) return;

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const points = rewardPoints > 0 ? rewardPoints : 1;

    try {
      await setDoc(doc(db, "pins", pin), {
        points,
        used: false,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email || null,
      });

      const link = `${baseUrl}/scan?pin=${pin}`;

      setGeneratedPin(pin);
      setGeneratedLink(link);

      setPinHistory((prev) => [
        {
          id: pin,
          pin,
          points,
          used: false,
          createdAt: { toDate: () => new Date() } as any,
        },
        ...prev,
      ]);

      setGlobalMessage(`สร้าง PIN ${pin} สำเร็จ`);
    } catch (err) {
      console.error(err);
      setGlobalError("สร้าง PIN ไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        กำลังโหลด...
      </div>
    );
  }

  /* =======================
     UI
  ======================= */
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <button
          onClick={() => signOut(auth)}
          className="text-sm text-red-300 hover:underline"
        >
          ออกจากระบบ
        </button>
      </header>

      {/* Create PIN */}
      <section className="rounded-2xl bg-white/10 p-5 mb-6">
        <h2 className="font-semibold mb-2">สร้าง PIN รับแต้ม</h2>

        <div className="flex gap-3 items-end">
          <input
            type="number"
            min={1}
            value={rewardPoints}
            onChange={(e) => setRewardPoints(Number(e.target.value))}
            className="w-24 rounded-lg bg-slate-900 px-3 py-2 text-sm"
          />
          <button
            onClick={handleGeneratePin}
            className="rounded-full bg-emerald-400 text-slate-900 px-4 py-2 text-sm font-medium"
          >
            สร้าง PIN
          </button>
        </div>

        {generatedPin && (
          <div className="mt-4 space-y-2">
            <p>
              PIN: <span className="font-mono text-emerald-300">{generatedPin}</span>
            </p>
            <div className="bg-white p-3 inline-block rounded-xl">
              <QRCode value={generatedLink} size={128} />
            </div>
            <p className="text-xs text-slate-300">{generatedLink}</p>
          </div>
        )}
      </section>

      {/* PIN History */}
      <section className="rounded-2xl bg-white/10 p-5">
        <h2 className="font-semibold mb-2">ประวัติ PIN ล่าสุด</h2>
        {pinHistory.length === 0 ? (
          <p className="text-sm text-slate-300">ยังไม่มี PIN</p>
        ) : (
          <ul className="text-sm space-y-1">
            {pinHistory.map((p) => (
              <li key={p.id}>
                PIN {p.pin} — {p.points} แต้ม —{" "}
                {p.used ? "ใช้แล้ว" : "ยังไม่ใช้"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
