"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("คลิกเพื่อเริ่มสแกน");
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // 1. ตรวจสอบว่ามี PIN ส่งมาใน URL หรือไม่ (กรณีสแกนผ่านกล้องมือถือปกติ)
  useEffect(() => {
    const pin = searchParams.get("pin");
    if (pin && !scanned) {
      setScanned(true);
      setShowScanner(true);
      setStatus("success");
      setMessage("พบข้อมูล PIN กำลังดำเนินการ...");
      router.push(`/reward_points?pin=${pin}`);
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
        setMessage("กรุณาสแกน QR Code");

        await qr.start(
          { facingMode: "environment" }, // ใช้กล้องหลัง
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (scanned) return;

            setScanned(true);
            setStatus("success");
            setMessage("สแกนสำเร็จ");

            qr.stop().then(() => qr.clear()).catch(console.error);

            try {
              const url = new URL(decodedText);
              const pin = url.searchParams.get("pin");

              if (!pin) {
                if (/^\d+$/.test(decodedText)) {
                   router.push(`/reward_points?pin=${decodedText}`);
                   return;
                }
                throw new Error("Invalid QR");
              }

              router.push(`/reward_points?pin=${pin}`);
            } catch {
              setStatus("error");
              setMessage("ไม่สามารถอ่าน QR Code ได้");
            }
          },
          (errorMessage) => {
            // ignore frame errors
          }
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
    setMessage("กำลังเปิดกล้อง...");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-black text-white px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-2xl text-center">
        <h1 className="text-lg font-semibold mb-2">สแกน QR รับแต้ม</h1>
        <p className="text-sm text-white/70 mb-4">{message}</p>

        {!showScanner && status !== 'success' && (
          <button
            onClick={handleStartScan}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors duration-300"
          >
            สแกน QR Code
          </button>
        )}

        <div
          id="qr-reader"
          className={`rounded-2xl overflow-hidden border border-white/20 ${
            showScanner && status !== 'success' ? "block" : "hidden"
          }`}
        />

        {status === "error" && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-red-300 underline"
          >
            ลองใหม่อีกครั้ง
          </button>
        )}
      </div>
    </main>
  );
}
