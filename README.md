# ⭐ Points — ระบบสะสมแต้มสแตมป์การ์ดดิจิทัล

> **Digital Loyalty System** สำหรับร้านกาแฟและธุรกิจขนาดเล็ก
> แทนที่บัตรกระดาษด้วยสแตมป์การ์ดดิจิทัล ลูกค้าสะสมแต้มผ่าน QR Code ไม่ต้องโหลดแอป

---

## 📋 สารบัญ

- [ภาพรวม](#-ภาพรวม)
- [ฟีเจอร์หลัก](#-ฟีเจอร์หลัก)
- [โครงสร้างโปรเจค](#-โครงสร้างโปรเจค)
- [Tech Stack](#-tech-stack)
- [การติดตั้งและรันโปรเจค](#-การติดตั้งและรันโปรเจค)
- [หน้าต่างๆ ในระบบ](#-หน้าต่างๆ-ในระบบ)
- [Demo Mode](#-demo-mode)
- [การทดลองใช้งาน](#-การทดลองใช้งาน)

---

## 🎯 ภาพรวม

**Points** คือระบบสะสมแต้มแบบ Web App ที่ออกแบบมาสำหรับร้านกาแฟและธุรกิจขนาดเล็ก โดยแทนที่บัตรสะสมแต้มแบบกระดาษด้วยระบบดิจิทัลที่ใช้งานง่าย ทั้งฝั่งลูกค้าและเจ้าของร้าน

**ลูกค้า** — สแกน QR Code หรือกรอก PIN รับแต้ม แล้วแลกรางวัล เช่น เครื่องดื่มฟรี เมื่อครบ 10 แต้ม
**เจ้าของร้าน** — ใช้หน้า Admin สร้าง PIN / QR Code และจัดการข้อมูลสมาชิกได้ทั้งหมด

> โปรเจคนี้รวม **Demo Mode** ที่รันแบบ client-side ล้วน ไม่ต้องต่อฐานข้อมูลใดๆ เหมาะสำหรับการสาธิต

---

## ✨ ฟีเจอร์หลัก

### 👤 สำหรับลูกค้า
- ดูสแตมป์การ์ดและยอดแต้มสะสม
- กรอก PIN หรือสแกน QR Code เพื่อรับแต้ม
- แลกรางวัลเมื่อสะสมครบ 10 แต้ม (รับเครื่องดื่มฟรี 1 แก้ว)
- ดูประวัติการรับและใช้แต้มย้อนหลัง

### 🏪 สำหรับเจ้าของร้าน (Admin)
- สร้างรหัส PIN พร้อม QR Code ตามจำนวนแต้มที่ต้องการ
- คัดลอกลิงก์แนบ QR Code ให้ลูกค้าสแกนได้ทันที
- ดูรายชื่อลูกค้าทั้งหมดพร้อมยอดแต้ม
- ค้นหาลูกค้าด้วยชื่อ เบอร์ หรืออีเมล
- เพิ่ม/หักแต้มให้ลูกค้าแต่ละรายได้โดยตรง
- ดูประวัติการใช้แต้มของลูกค้าแต่ละคน พร้อม filter ตามประเภท
- ดูประวัติ PIN ที่สร้างไปแล้ว

### 📱 จำลองการสแกน QR
- หน้า `/scan` สำหรับจำลองการสแกน QR Code จากกล้อง

---

## 📁 โครงสร้างโปรเจค

```
Points/
├── app/
│   ├── page.tsx              # หน้า Landing Page (แนะนำระบบ + Interactive Demo)
│   ├── layout.tsx            # Root layout พร้อม DemoProvider
│   ├── globals.css           # Global styles + Tailwind
│   ├── login/
│   │   └── page.tsx          # หน้า Login
│   ├── register/
│   │   └── page.tsx          # หน้าสมัครสมาชิก
│   ├── reward_points/
│   │   ├── page.tsx          # หน้าหลักของลูกค้า (Server Component wrapper)
│   │   └── RewardPointsClient.tsx  # Client Component: สแตมป์การ์ด, PIN, แลกของรางวัล
│   ├── admin/
│   │   └── page.tsx          # หน้า Admin Dashboard
│   └── scan/
│       └── page.tsx          # หน้าจำลองการสแกน QR Code
├── components/
│   └── DemoBar.tsx           # Banner แสดงสถานะ Demo Mode
├── lib/
│   └── demo-context.tsx      # Demo Context (state, logic ทั้งหมดของ demo)
├── public/                   # Static assets
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 🛠 Tech Stack

| เทคโนโลยี | เวอร์ชัน | รายละเอียด |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16.x | React Framework (App Router) |
| [React](https://react.dev/) | 19.x | UI Library |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Type Safety |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Styling |
| [react-qr-code](https://www.npmjs.com/package/react-qr-code) | 2.x | สร้าง QR Code |
| [html5-qrcode](https://www.npmjs.com/package/html5-qrcode) | 2.x | สแกน QR Code จากกล้อง |
| [Bun](https://bun.sh/) | latest | Package Manager / Runtime |

---

## 🚀 การติดตั้งและรันโปรเจค

### ความต้องการ
- [Node.js](https://nodejs.org/) 18+ หรือ [Bun](https://bun.sh/)

### ขั้นตอน

```bash
# 1. Clone repository
git clone https://github.com/your-username/Points.git
cd Points

# 2. ติดตั้ง dependencies
bun install
# หรือ
npm install

# 3. รัน Development Server
bun run dev
# หรือ
npm run dev
```

เปิดเบราว์เซอร์แล้วไปที่ http://localhost:3000

### คำสั่งอื่นๆ

```bash
bun run build    # Build สำหรับ Production
bun run start    # รัน Production server
bun run lint     # ตรวจสอบ code ด้วย ESLint
```

---

## 📄 หน้าต่างๆ ในระบบ

| Route | หน้า | รายละเอียด |
|---|---|---|
| `/` | Landing Page | แนะนำระบบ พร้อม Interactive Demo |
| `/login` | เข้าสู่ระบบ | หน้า Login (มีปุ่ม Demo 1 คลิก) |
| `/register` | สมัครสมาชิก | หน้าสมัครสมาชิก |
| `/reward_points` | หน้าลูกค้า | ดูแต้ม, กรอก PIN, แลกของรางวัล |
| `/admin` | Admin Dashboard | จัดการร้าน, สร้าง PIN, ดูข้อมูลลูกค้า |
| `/scan` | สแกน QR | จำลองการสแกน QR Code |

---

## 🎮 Demo Mode

โปรเจคมี **Demo Mode** แบบ client-side ที่สมบูรณ์ — ไม่ต้องต่อ backend หรือฐานข้อมูลใดๆ

### วิธีเปิด Demo Mode
เพิ่ม query parameter `?demo=true` ต่อท้าย URL

```
http://localhost:3000/reward_points?demo=true
http://localhost:3000/admin?demo=true
```

### ข้อมูล Demo ที่มีให้ทดลอง
- **ลูกค้า Demo**: มีแต้มเริ่มต้น 7 แต้ม (อีก 3 แต้มจะครบ 10)
- **PIN สำเร็จรูป**: `999999`, `777888` (3 แต้ม), `123456` หรือตัวเลข 6 หลักใดๆ
- **ลูกค้าทั้งหมด**: 5 รายในระบบ พร้อมข้อมูลจำลอง
- **PIN ประวัติ**: มีทั้งสถานะ "พร้อมใช้" และ "ใช้แล้ว"

### State Persistence
Demo state จะบันทึกใน `localStorage` อัตโนมัติ เพื่อให้ข้อมูลคงอยู่ระหว่าง page refresh

---

## 🧪 การทดลองใช้งาน

### ทดลองฝั่งลูกค้า
1. ไปที่ http://localhost:3000/reward_points?demo=true
2. กรอก PIN `999999` เพื่อรับ +1 แต้ม
3. เมื่อแต้มครบ 10 กด "แลกรับฟรี" เพื่อใช้สิทธิ์

### ทดลองฝั่งแอดมิน
1. ไปที่ http://localhost:3000/admin?demo=true
2. กำหนดจำนวนแต้ม แล้วกด "สร้าง PIN + QR"
3. นำ PIN ที่ได้ไปกรอกในหน้าลูกค้าเพื่อทดสอบ
4. ลองเพิ่ม/หักแต้มให้ลูกค้าในตาราง
5. กด "ดูประวัติ" เพื่อดู log การใช้งาน
