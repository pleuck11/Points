export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">
        Points
      </h1>
      <p className="text-slate-600 mb-6 text-center max-w-md">
        ระบบสะสมแต้มสำหรับร้านค้าและลูกค้า ล็อกอินเพื่อสะสมและเช็คแต้มของคุณ
      </p>
      <div className="flex gap-3">
        <a
          href="/register"
          className="rounded-md bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-700"
        >
          สมัครสมาชิก
        </a>
        <a
          href="/login"
          className="rounded-md border border-sky-600 text-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-50"
        >
          เข้าสู่ระบบ
        </a>
      </div>
    </main>
  );
}
