"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("กดปุ่มเพื่อเปิดกล้องสแกน QR Code");
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const pin = searchParams.get("pin");
    if (pin && !scanned) {
      setScanned(true);
      setShowScanner(true);
      setStatus("success");
      setMessage("พบข้อมูล PIN กำลังดำเนินการ...");
      router.push(`/reward_points?pin=${pin}&demo=true`);
    }
  }, [searchParams, router, scanned]);

  useEffect(() => {
    if (!showScanner || scanned || searchParams.get("pin")) return;

    const startScanner = async () => {
      try {
        if (!qrRef.current) {
          qrRef.current = new Html5Qrcode("qr-reader");
        }
        const qr = qrRef.current;

        setStatus("scanning");
        setMessage("กรุณาส่องกล้องไปที่ QR Code");

        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (scanned) return;

            setScanned(true);
            setStatus("success");
            setMessage("สแกนสำเร็จ!");

            qr.stop().then(() => qr.clear()).catch(console.error);

            try {
              const url = new URL(decodedText);
              const pin = url.searchParams.get("pin");

              if (!pin) {
                if (/^\d+$/.test(decodedText)) {
                  router.push(`/reward_points?pin=${decodedText}&demo=true`);
                  return;
                }
                throw new Error("Invalid QR");
              }

              router.push(`/reward_points?pin=${pin}&demo=true`);
            } catch {
              if (/^\d{6}$/.test(decodedText)) {
                router.push(`/reward_points?pin=${decodedText}&demo=true`);
                return;
              }
              setStatus("error");
              setMessage("ไม่สามารถอ่านข้อมูลจาก QR Code นี้ได้");
            }
          },
          () => {}
        );
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage("ไม่สามารถเปิดกล้องได้");
      }
    };

    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      if (qrRef.current && qrRef.current.isScanning) {
        qrRef.current.stop().then(() => qrRef.current?.clear()).catch(() => {});
      }
    };
  }, [router, scanned, searchParams, showScanner]);

  const handleStartScan = () => {
    setShowScanner(true);
    setMessage("กำลังเริ่มต้นระบบกล้อง...");
  };

  const handleSimulateScan = (pin: string) => {
    setScanned(true);
    setStatus("success");
    setMessage(`จำลองการสแกน PIN #${pin} สำเร็จ...`);
    setTimeout(() => {
      router.push(`/reward_points?pin=${pin}&demo=true`);
    }, 600);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#090d16] text-white px-4 py-8 relative overflow-hidden">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 h-80 w-80 rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm glass-panel rounded-2xl p-6 shadow-xl border border-white/10 text-center">
        {/* Header */}
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2m0-5h18M12 12h.01" />
          </svg>
        </div>
        <h1 className="text-sm font-semibold text-white mb-1">สแกน QR รับแต้ม</h1>
        <p className="text-xs text-slate-500 mb-5">{message}</p>

        {!showScanner && status !== "success" && (
          <div className="space-y-3">
            <button
              onClick={handleStartScan}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold py-3 px-4 rounded-xl text-sm transition"
            >
              เปิดกล้องสแกน
            </button>

            <div className="rounded-xl border border-white/8 bg-white/3 p-3 text-left space-y-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                จำลองสแกน (สำหรับทดสอบ)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulateScan("999999")}
                  className="py-1.5 px-2 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 text-amber-400 text-xs font-medium transition"
                >
                  PIN 999999 (+1)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateScan("777888")}
                  className="py-1.5 px-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/20 text-indigo-400 text-xs font-medium transition"
                >
                  PIN 777888 (+3)
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          id="qr-reader"
          className={`rounded-xl overflow-hidden border border-white/15 my-3 ${
            showScanner && status !== "success" ? "block" : "hidden"
          }`}
        />

        {status === "error" && (
          <div className="mt-3">
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              ลองเปิดกล้องใหม่
            </button>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-white/8">
          <Link href="/reward_points?demo=true" className="text-xs text-slate-500 hover:text-slate-300 transition">
            ← กลับหน้าแต้มสะสม
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#090d16]">
          <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
