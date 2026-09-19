"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type DemoUser = {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  points: number;
  role?: "user" | "admin";
  avatar?: string;
  membershipDate?: string;
};

export type DemoPointLog = {
  id: string;
  delta: number;
  type: "pin_redeem" | "redeem" | "admin_adjust";
  newPoints: number;
  source: string;
  createdAt: string;
  adminEmail?: string;
  pin?: string;
  note?: string;
};

export type DemoPinRecord = {
  id: string;
  pin: string;
  points: number;
  createdAt: string;
  used: boolean;
  usedAt?: string;
  usedBy?: string;
};

interface DemoContextType {
  isDemo: boolean;
  setIsDemo: (val: boolean) => void;
  // Customer side
  customerUser: DemoUser;
  customerPointLogs: DemoPointLog[];
  customerRedeemLogs: DemoPointLog[];
  claimPin: (pin: string) => { success: boolean; points: number; message: string };
  redeemReward: () => { success: boolean; message: string };
  addCustomerPoints: (delta: number, note?: string) => void;
  
  // Admin side
  adminUser: DemoUser;
  adminCustomers: DemoUser[];
  adminPins: DemoPinRecord[];
  generatePin: (points: number) => DemoPinRecord;
  adjustCustomerPoints: (uid: string, delta: number) => void;
  getCustomerLogs: (uid: string) => DemoPointLog[];
  
  // Controls
  resetDemoData: () => void;
};

const INITIAL_CUSTOMER: DemoUser = {
  uid: "demo-cust-001",
  displayName: "ลูกค้าคนที่ 1 (Demo)",
  email: "customer01.demo@storecafe.com",
  phone: "080-000-0001",
  points: 7,
  role: "user",
  membershipDate: "15 ม.ค. 2026",
};

const INITIAL_ADMIN: DemoUser = {
  uid: "demo-admin-001",
  displayName: "ผู้จัดการร้าน (Demo)",
  email: "admin.demo@storecafe.com",
  phone: "020-000-0000",
  points: 99,
  role: "admin",
};

const INITIAL_ADMIN_CUSTOMERS: DemoUser[] = [
  {
    uid: "demo-cust-001",
    displayName: "ลูกค้าคนที่ 1 (Demo)",
    email: "customer01.demo@storecafe.com",
    phone: "080-000-0001",
    points: 7,
    role: "user",
    membershipDate: "15 ม.ค. 2026",
  },
  {
    uid: "demo-cust-002",
    displayName: "ลูกค้าคนที่ 2",
    email: "customer02.demo@storecafe.com",
    phone: "080-000-0002",
    points: 14,
    role: "user",
    membershipDate: "20 ก.พ. 2026",
  },
  {
    uid: "demo-cust-003",
    displayName: "ลูกค้าคนที่ 3",
    email: "customer03.demo@storecafe.com",
    phone: "080-000-0003",
    points: 3,
    role: "user",
    membershipDate: "05 มี.ค. 2026",
  },
  {
    uid: "demo-cust-004",
    displayName: "ลูกค้าคนที่ 4",
    email: "customer04.demo@storecafe.com",
    phone: "080-000-0004",
    points: 9,
    role: "user",
    membershipDate: "12 ม.ค. 2026",
  },
  {
    uid: "demo-cust-005",
    displayName: "ลูกค้าคนที่ 5",
    email: "customer05.demo@storecafe.com",
    phone: "080-000-0005",
    points: 21,
    role: "user",
    membershipDate: "01 ม.ค. 2026",
  },
];

const INITIAL_CUSTOMER_LOGS: DemoPointLog[] = [
  {
    id: "log-001",
    delta: 1,
    type: "pin_redeem",
    newPoints: 7,
    source: "pin",
    pin: "982314",
    note: "สแกนรับแต้มกาแฟสด",
    createdAt: "เมื่อวานนี้ 14:30 น.",
  },
  {
    id: "log-002",
    delta: 1,
    type: "pin_redeem",
    newPoints: 6,
    source: "pin",
    pin: "451290",
    note: "สแกนรับแต้มลาเต้เย็น",
    createdAt: "3 วันที่แล้ว 10:15 น.",
  },
  {
    id: "log-003",
    delta: -10,
    type: "redeem",
    newPoints: 5,
    source: "reward",
    note: "แลกรับฟรี คาปูชิโน่เย็น 1 แก้ว (สะสมครบ 10 แต้ม)",
    createdAt: "1 สัปดาห์ที่แล้ว 16:45 น.",
  },
  {
    id: "log-004",
    delta: 5,
    type: "admin_adjust",
    newPoints: 15,
    source: "admin",
    adminEmail: "admin@storecafe.com",
    note: "ของขวัญแต้มพิเศษต้อนรับสมาชิกใหม่",
    createdAt: "15 ม.ค. 2026",
  },
  {
    id: "log-005",
    delta: -10,
    type: "redeem",
    newPoints: 10,
    source: "reward",
    note: "แลกรับฟรี มัฟฟินบลูเบอร์รี่ 1 ชิ้น",
    createdAt: "2 สัปดาห์ที่แล้ว 11:20 น.",
  },
];

const INITIAL_PINS: DemoPinRecord[] = [
  {
    id: "pin-999999",
    pin: "999999",
    points: 1,
    createdAt: "วันนี้ 09:00 น.",
    used: false,
  },
  {
    id: "pin-777888",
    pin: "777888",
    points: 3,
    createdAt: "วันนี้ 11:30 น.",
    used: false,
  },
  {
    id: "pin-982314",
    pin: "982314",
    points: 1,
    createdAt: "เมื่อวานนี้ 14:28 น.",
    used: true,
    usedAt: "เมื่อวานนี้ 14:30 น.",
    usedBy: "คุณกิตติศักดิ์ ชัยชนะ",
  },
  {
    id: "pin-451290",
    pin: "451290",
    points: 1,
    createdAt: "3 วันที่แล้ว 10:10 น.",
    used: true,
    usedAt: "3 วันที่แล้ว 10:15 น.",
    usedBy: "คุณกิตติศักดิ์ ชัยชนะ",
  },
];

const DemoContext = createContext<DemoContextType | null>(null);

const STORAGE_KEY = "points_demo_store_v1";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState<boolean>(true);
  const [customerUser, setCustomerUser] = useState<DemoUser>(INITIAL_CUSTOMER);
  const [adminCustomers, setAdminCustomers] = useState<DemoUser[]>(INITIAL_ADMIN_CUSTOMERS);
  const [customerPointLogs, setCustomerPointLogs] = useState<DemoPointLog[]>(INITIAL_CUSTOMER_LOGS);
  const [adminPins, setAdminPins] = useState<DemoPinRecord[]>(INITIAL_PINS);

  // Load from localStorage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check query param
      const urlParams = new URLSearchParams(window.location.search);
      const queryDemo = urlParams.get("demo");
      if (queryDemo === "false") {
        setIsDemo(false);
      } else if (queryDemo === "true") {
        setIsDemo(true);
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.customerUser) setCustomerUser(parsed.customerUser);
          if (parsed.adminCustomers) setAdminCustomers(parsed.adminCustomers);
          if (parsed.customerPointLogs) setCustomerPointLogs(parsed.customerPointLogs);
          if (parsed.adminPins) setAdminPins(parsed.adminPins);
        }
      } catch (err) {
        console.error("Failed to parse demo state from localStorage", err);
      }
    }
  }, []);

  // Save to localStorage
  const persistState = (
    cUser: DemoUser,
    cList: DemoUser[],
    cLogs: DemoPointLog[],
    pins: DemoPinRecord[]
  ) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            customerUser: cUser,
            adminCustomers: cList,
            customerPointLogs: cLogs,
            adminPins: pins,
          })
        );
      } catch (e) {
        console.warn("Storage error", e);
      }
    }
  };

  const customerRedeemLogs = customerPointLogs.filter(
    (l) => l.type === "redeem" || (l.delta < 0 && l.source === "reward")
  );

  // Customer claims a PIN
  const claimPin = (pinStr: string): { success: boolean; points: number; message: string } => {
    const trimmed = pinStr.trim();
    if (!trimmed) {
      return { success: false, points: 0, message: "กรุณากรอกรหัส PIN" };
    }

    // Check if matching in adminPins
    const pinIndex = adminPins.findIndex((p) => p.pin === trimmed);
    let pts = 1;

    if (pinIndex !== -1) {
      const pinObj = adminPins[pinIndex];
      if (pinObj.used) {
        return { success: false, points: 0, message: "PIN นี้ถูกใช้งานไปแล้ว" };
      }
      pts = pinObj.points;
      
      const updatedPins = [...adminPins];
      updatedPins[pinIndex] = {
        ...pinObj,
        used: true,
        usedAt: "เมื่อสักครู่",
        usedBy: customerUser.displayName,
      };
      setAdminPins(updatedPins);
    } else if (trimmed === "999999" || trimmed === "123456" || trimmed === "777888") {
      pts = trimmed === "777888" ? 3 : 1;
    } else if (/^\d{6}$/.test(trimmed)) {
      // Allow any 6-digit pin in demo!
      pts = 1;
    } else {
      return { success: false, points: 0, message: "รหัส PIN ต้องเป็นตัวเลข 6 หลัก (เช่น 999999)" };
    }

    const newPoints = customerUser.points + pts;
    const updatedCustomer: DemoUser = {
      ...customerUser,
      points: newPoints,
    };

    const newLog: DemoPointLog = {
      id: `log-${Date.now()}`,
      delta: pts,
      type: "pin_redeem",
      newPoints,
      source: "pin",
      pin: trimmed,
      note: `รับแต้มจากรหัส PIN #${trimmed}`,
      createdAt: "เมื่อสักครู่",
    };

    const updatedLogs = [newLog, ...customerPointLogs];
    const updatedAdminCusts = adminCustomers.map((u) =>
      u.uid === customerUser.uid ? { ...u, points: newPoints } : u
    );

    setCustomerUser(updatedCustomer);
    setCustomerPointLogs(updatedLogs);
    setAdminCustomers(updatedAdminCusts);

    persistState(updatedCustomer, updatedAdminCusts, updatedLogs, adminPins);

    return {
      success: true,
      points: pts,
      message: `ใช้ PIN สำเร็จ! คุณได้รับ +${pts} แต้มสะสม`,
    };
  };

  // Customer redeems reward (costs 10 points)
  const redeemReward = (): { success: boolean; message: string } => {
    if (customerUser.points < 10) {
      return {
        success: false,
        message: `แต้มสะสมยังไม่ครบ 10 แต้ม (ขาดอีก ${10 - customerUser.points} แต้ม)`,
      };
    }

    const newPoints = customerUser.points - 10;
    const updatedCustomer: DemoUser = {
      ...customerUser,
      points: newPoints,
    };

    const newLog: DemoPointLog = {
      id: `log-${Date.now()}`,
      delta: -10,
      type: "redeem",
      newPoints,
      source: "reward",
      note: "แลกรับสิทธิ์เครื่องดื่มฟรี 1 แก้ว (ใช้ 10 แต้ม)",
      createdAt: "เมื่อสักครู่",
    };

    const updatedLogs = [newLog, ...customerPointLogs];
    const updatedAdminCusts = adminCustomers.map((u) =>
      u.uid === customerUser.uid ? { ...u, points: newPoints } : u
    );

    setCustomerUser(updatedCustomer);
    setCustomerPointLogs(updatedLogs);
    setAdminCustomers(updatedAdminCusts);

    persistState(updatedCustomer, updatedAdminCusts, updatedLogs, adminPins);

    return {
      success: true,
      message: "แลกของรางวัลสำเร็จ! ยอดแต้มสะสมถูกหัก 10 แต้ม",
    };
  };

  // Direct add points for quick demo testing
  const addCustomerPoints = (delta: number, note = "ทดสอบเพิ่มแต้มเดโม") => {
    const newPoints = Math.max(0, customerUser.points + delta);
    const updatedCustomer: DemoUser = {
      ...customerUser,
      points: newPoints,
    };

    const newLog: DemoPointLog = {
      id: `log-${Date.now()}`,
      delta,
      type: delta >= 0 ? "pin_redeem" : "admin_adjust",
      newPoints,
      source: "demo_quick_action",
      note,
      createdAt: "เมื่อสักครู่",
    };

    const updatedLogs = [newLog, ...customerPointLogs];
    const updatedAdminCusts = adminCustomers.map((u) =>
      u.uid === customerUser.uid ? { ...u, points: newPoints } : u
    );

    setCustomerUser(updatedCustomer);
    setCustomerPointLogs(updatedLogs);
    setAdminCustomers(updatedAdminCusts);

    persistState(updatedCustomer, updatedAdminCusts, updatedLogs, adminPins);
  };

  // Admin generates a new PIN
  const generatePin = (points: number): DemoPinRecord => {
    const randPin = String(Math.floor(100000 + Math.random() * 900000));
    const newPinRecord: DemoPinRecord = {
      id: `pin-${randPin}`,
      pin: randPin,
      points: points > 0 ? points : 1,
      createdAt: "เมื่อสักครู่",
      used: false,
    };

    const updatedPins = [newPinRecord, ...adminPins];
    setAdminPins(updatedPins);
    persistState(customerUser, adminCustomers, customerPointLogs, updatedPins);
    return newPinRecord;
  };

  // Admin adjusts customer points (+ or -)
  const adjustCustomerPoints = (uid: string, delta: number) => {
    let newAdminCusts = adminCustomers.map((u) => {
      if (u.uid === uid) {
        return { ...u, points: Math.max(0, u.points + delta) };
      }
      return u;
    });

    let newCustUser = customerUser;
    let newLogs = customerPointLogs;

    // If target is the current customer
    if (uid === customerUser.uid) {
      const newPts = Math.max(0, customerUser.points + delta);
      newCustUser = { ...customerUser, points: newPts };
      const newLog: DemoPointLog = {
        id: `log-${Date.now()}`,
        delta,
        type: "admin_adjust",
        newPoints: newPts,
        source: "admin",
        adminEmail: "admin@storecafe.com",
        note: `ผู้ดูแลระบบปรับแต่งแต้ม (${delta > 0 ? `+${delta}` : delta} แต้ม)`,
        createdAt: "เมื่อสักครู่",
      };
      newLogs = [newLog, ...customerPointLogs];
      setCustomerUser(newCustUser);
      setCustomerPointLogs(newLogs);
    }

    setAdminCustomers(newAdminCusts);
    persistState(newCustUser, newAdminCusts, newLogs, adminPins);
  };

  const getCustomerLogs = (uid: string): DemoPointLog[] => {
    if (uid === customerUser.uid) {
      return customerPointLogs;
    }
    // Return sample logs for other users
    return [
      {
        id: `log-other-${uid}-1`,
        delta: 2,
        type: "pin_redeem",
        newPoints: 10,
        source: "pin",
        pin: "583921",
        note: "สแกนรับแต้มกาแฟดริป",
        createdAt: "เมื่อวานนี้",
      },
      {
        id: `log-other-${uid}-2`,
        delta: -10,
        type: "redeem",
        newPoints: 8,
        source: "reward",
        note: "แลกสิทธิ์รับเค้กแครอทฟรี",
        createdAt: "4 วันที่แล้ว",
      },
    ];
  };

  const resetDemoData = () => {
    setCustomerUser(INITIAL_CUSTOMER);
    setAdminCustomers(INITIAL_ADMIN_CUSTOMERS);
    setCustomerPointLogs(INITIAL_CUSTOMER_LOGS);
    setAdminPins(INITIAL_PINS);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <DemoContext.Provider
      value={{
        isDemo,
        setIsDemo,
        customerUser,
        customerPointLogs,
        customerRedeemLogs,
        claimPin,
        redeemReward,
        addCustomerPoints,
        adminUser: INITIAL_ADMIN,
        adminCustomers,
        adminPins,
        generatePin,
        adjustCustomerPoints,
        getCustomerLogs,
        resetDemoData,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}
