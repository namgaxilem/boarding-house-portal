import "server-only";

import type { Profile, Room, RoomEvent, Tenancy, WifiNetwork } from "@/types";

/**
 * In-memory data for demo mode.
 *
 * Lives on `globalThis` so it survives hot reloads during development. It is
 * wiped on every server restart — that is intentional, it is a preview of the
 * UI, not storage.
 */

export interface DemoDatabase {
  profiles: Profile[];
  rooms: Room[];
  tenancies: Tenancy[];
  events: RoomEvent[];
  wifi: WifiNetwork[];
  /** userId -> plaintext password. Demo only; the real app never stores these. */
  passwords: Record<string, string>;
  sequence: number;
}

const ADMIN_ID = "user-admin";

function seed(): DemoDatabase {
  const profiles: Profile[] = [
    {
      id: ADMIN_ID,
      email: "admin@nhatro.vn",
      fullName: "Chủ trọ Nguyễn Văn Tâm",
      phone: "0901234567",
      role: "admin",
      dateOfBirth: "1978-04-12",
      hometown: "Nam Định",
      note: null,
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "user-an",
      email: "an@example.com",
      fullName: "Nguyễn Văn An",
      phone: "0912345678",
      role: "tenant",
      dateOfBirth: "2001-06-15",
      hometown: "Thanh Hóa",
      note: "Sinh viên năm 4, đóng tiền đúng hạn.",
      isActive: true,
      createdAt: "2025-03-01T00:00:00.000Z",
    },
    {
      id: "user-binh",
      email: "binh@example.com",
      fullName: "Trần Thị Bình",
      phone: "0923456789",
      role: "tenant",
      dateOfBirth: "1999-11-02",
      hometown: "Hải Dương",
      note: "Ở ghép với chị Hoa.",
      isActive: true,
      createdAt: "2025-05-20T00:00:00.000Z",
    },
    {
      id: "user-hoa",
      email: "hoa@example.com",
      fullName: "Lê Thị Hoa",
      phone: "0934567890",
      role: "tenant",
      dateOfBirth: "2000-02-28",
      hometown: "Thái Bình",
      note: null,
      isActive: true,
      createdAt: "2025-05-20T00:00:00.000Z",
    },
    {
      id: "user-cuong",
      email: "cuong@example.com",
      fullName: "Phạm Minh Cường",
      phone: "0945678901",
      role: "tenant",
      dateOfBirth: "1996-09-09",
      hometown: "Nghệ An",
      note: "Đi làm ca đêm, hay về khuya.",
      isActive: true,
      createdAt: "2024-11-10T00:00:00.000Z",
    },
    {
      id: "user-dung",
      email: "dung@example.com",
      fullName: "Hoàng Thị Dung",
      phone: "0956789012",
      role: "tenant",
      dateOfBirth: "1997-07-21",
      hometown: "Phú Thọ",
      note: null,
      isActive: true,
      createdAt: "2025-01-15T00:00:00.000Z",
    },
    {
      id: "user-em",
      email: "em@example.com",
      fullName: "Đỗ Văn Em",
      phone: "0967890123",
      role: "tenant",
      dateOfBirth: "1995-12-30",
      hometown: "Hưng Yên",
      note: null,
      isActive: true,
      createdAt: "2025-06-05T00:00:00.000Z",
    },
    {
      id: "user-giang",
      email: "giang@example.com",
      fullName: "Vũ Thị Giang",
      phone: "0978901234",
      role: "tenant",
      dateOfBirth: "2002-03-18",
      hometown: "Ninh Bình",
      note: null,
      isActive: true,
      createdAt: "2026-02-01T00:00:00.000Z",
    },
    {
      id: "user-hai",
      email: "hai@example.com",
      fullName: "Ngô Văn Hải",
      phone: "0989012345",
      role: "tenant",
      dateOfBirth: "1994-08-08",
      hometown: "Bắc Giang",
      note: "Đã trả phòng, chuyển vào Nam.",
      isActive: false,
      createdAt: "2024-02-01T00:00:00.000Z",
    },
  ];

  const roomDefaults = {
    electricPrice: 3800,
    waterPrice: 25000,
    servicePrice: 100000,
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  const rooms: Room[] = [
    {
      id: "room-p101",
      code: "P101",
      floor: 1,
      areaM2: 20,
      basePrice: 2500000,
      maxOccupants: 2,
      status: "occupied",
      description: "Phòng góc, cửa sổ hướng đông, có gác lửng.",
      ...roomDefaults,
    },
    {
      id: "room-p102",
      code: "P102",
      floor: 1,
      areaM2: 24,
      basePrice: 2900000,
      maxOccupants: 3,
      status: "occupied",
      description: "Phòng rộng nhất tầng 1, phù hợp ở ghép.",
      ...roomDefaults,
    },
    {
      id: "room-p103",
      code: "P103",
      floor: 1,
      areaM2: 18,
      basePrice: 2300000,
      maxOccupants: 2,
      status: "vacant",
      description: "Vừa sơn lại, có điều hòa.",
      ...roomDefaults,
    },
    {
      id: "room-p104",
      code: "P104",
      floor: 1,
      areaM2: 20,
      basePrice: 2500000,
      maxOccupants: 2,
      status: "occupied",
      description: null,
      ...roomDefaults,
    },
    {
      id: "room-p105",
      code: "P105",
      floor: 1,
      areaM2: 18,
      basePrice: 2300000,
      maxOccupants: 2,
      status: "maintenance",
      description: "Đang chống thấm trần, dự kiến xong cuối tháng.",
      ...roomDefaults,
    },
    {
      id: "room-p201",
      code: "P201",
      floor: 2,
      areaM2: 22,
      basePrice: 2700000,
      maxOccupants: 2,
      status: "occupied",
      description: "Ban công riêng, thoáng.",
      ...roomDefaults,
    },
    {
      id: "room-p202",
      code: "P202",
      floor: 2,
      areaM2: 20,
      basePrice: 2600000,
      maxOccupants: 2,
      status: "occupied",
      description: null,
      ...roomDefaults,
    },
    {
      id: "room-p203",
      code: "P203",
      floor: 2,
      areaM2: 26,
      basePrice: 3200000,
      maxOccupants: 3,
      status: "vacant",
      description: "Phòng lớn, có bếp riêng và nóng lạnh.",
      ...roomDefaults,
    },
    {
      id: "room-p204",
      code: "P204",
      floor: 2,
      areaM2: 20,
      basePrice: 2600000,
      maxOccupants: 2,
      status: "reserved",
      description: "Đã nhận cọc, vào ở đầu tháng sau.",
      ...roomDefaults,
    },
    {
      id: "room-p205",
      code: "P205",
      floor: 2,
      areaM2: 22,
      basePrice: 2800000,
      maxOccupants: 2,
      status: "occupied",
      description: "Cuối hành lang, yên tĩnh.",
      ...roomDefaults,
    },
  ];

  const tenancies: Tenancy[] = [
    // P101 — previous tenant, moved out. Gives the room a real history.
    {
      id: "tenancy-1",
      roomId: "room-p101",
      tenantId: "user-hai",
      isPrimary: true,
      startDate: "2024-02-01",
      endDate: "2025-02-28",
      deposit: 2400000,
      monthlyPrice: 2400000,
      status: "ended",
      endReason: "Chuyển đi nơi khác",
      createdAt: "2024-02-01T00:00:00.000Z",
    },
    {
      id: "tenancy-2",
      roomId: "room-p101",
      tenantId: "user-an",
      isPrimary: true,
      startDate: "2025-03-01",
      endDate: null,
      deposit: 2500000,
      monthlyPrice: 2500000,
      status: "active",
      endReason: null,
      createdAt: "2025-03-01T00:00:00.000Z",
    },
    {
      id: "tenancy-3",
      roomId: "room-p102",
      tenantId: "user-binh",
      isPrimary: true,
      startDate: "2025-05-20",
      endDate: null,
      deposit: 2900000,
      monthlyPrice: 2900000,
      status: "active",
      endReason: null,
      createdAt: "2025-05-20T00:00:00.000Z",
    },
    {
      id: "tenancy-4",
      roomId: "room-p102",
      tenantId: "user-hoa",
      isPrimary: false,
      startDate: "2025-05-20",
      endDate: null,
      deposit: 0,
      monthlyPrice: 0,
      status: "active",
      endReason: null,
      createdAt: "2025-05-20T00:00:00.000Z",
    },
    {
      id: "tenancy-5",
      roomId: "room-p104",
      tenantId: "user-cuong",
      isPrimary: true,
      startDate: "2024-11-10",
      endDate: null,
      deposit: 2500000,
      monthlyPrice: 2450000,
      status: "active",
      endReason: null,
      createdAt: "2024-11-10T00:00:00.000Z",
    },
    {
      id: "tenancy-6",
      roomId: "room-p201",
      tenantId: "user-dung",
      isPrimary: true,
      startDate: "2025-01-15",
      endDate: null,
      deposit: 2700000,
      monthlyPrice: 2700000,
      status: "active",
      endReason: null,
      createdAt: "2025-01-15T00:00:00.000Z",
    },
    {
      id: "tenancy-7",
      roomId: "room-p202",
      tenantId: "user-em",
      isPrimary: true,
      startDate: "2025-06-05",
      endDate: null,
      deposit: 2600000,
      monthlyPrice: 2600000,
      status: "active",
      endReason: null,
      createdAt: "2025-06-05T00:00:00.000Z",
    },
    {
      id: "tenancy-8",
      roomId: "room-p205",
      tenantId: "user-giang",
      isPrimary: true,
      startDate: "2026-02-01",
      endDate: null,
      deposit: 2800000,
      monthlyPrice: 2800000,
      status: "active",
      endReason: null,
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  ];

  const events: RoomEvent[] = [
    {
      id: "event-1",
      roomId: "room-p101",
      type: "checkout",
      title: "Ngô Văn Hải trả phòng",
      content: "Đã hoàn cọc đầy đủ, phòng bàn giao sạch.",
      cost: null,
      occurredAt: "2025-02-28T09:00:00.000Z",
      createdBy: ADMIN_ID,
    },
    {
      id: "event-2",
      roomId: "room-p101",
      type: "maintenance",
      title: "Sơn lại tường và thay bóng đèn",
      content: "Sơn 2 lớp, thay 3 bóng LED.",
      cost: 1200000,
      occurredAt: "2025-02-28T14:00:00.000Z",
      createdBy: ADMIN_ID,
    },
    {
      id: "event-3",
      roomId: "room-p101",
      type: "checkin",
      title: "Nguyễn Văn An nhận phòng",
      content: null,
      cost: null,
      occurredAt: "2025-03-01T08:00:00.000Z",
      createdBy: ADMIN_ID,
    },
    {
      id: "event-4",
      roomId: "room-p105",
      type: "incident",
      title: "Thấm trần sau mưa lớn",
      content: "Nước nhỏ giọt góc phòng, đã tạm che bạt.",
      cost: null,
      occurredAt: "2026-06-18T20:30:00.000Z",
      createdBy: ADMIN_ID,
    },
    {
      id: "event-5",
      roomId: "room-p105",
      type: "maintenance",
      title: "Thuê thợ chống thấm trần",
      content: "Dự kiến 5 ngày, đang thi công.",
      cost: 4500000,
      occurredAt: "2026-07-20T08:00:00.000Z",
      createdBy: ADMIN_ID,
    },
    {
      id: "event-6",
      roomId: "room-p104",
      type: "price_change",
      title: "Giữ giá cũ cho khách ở lâu",
      content: "Giá niêm yết 2.500.000đ, giữ 2.450.000đ cho anh Cường.",
      cost: null,
      occurredAt: "2025-11-10T10:00:00.000Z",
      createdBy: ADMIN_ID,
    },
    {
      id: "event-7",
      roomId: "room-p203",
      type: "maintenance",
      title: "Lắp bình nóng lạnh mới",
      content: null,
      cost: 2300000,
      occurredAt: "2026-07-02T09:00:00.000Z",
      createdBy: ADMIN_ID,
    },
    {
      id: "event-8",
      roomId: "room-p204",
      type: "note",
      title: "Đã nhận cọc giữ chỗ 1.000.000đ",
      content: "Khách hẹn vào ở đầu tháng sau.",
      cost: null,
      occurredAt: "2026-07-28T16:00:00.000Z",
      createdBy: ADMIN_ID,
    },
  ];

  const wifi: WifiNetwork[] = [
    {
      id: "wifi-1",
      ssid: "NhaTro-TanPhat",
      password: "tanphat2024",
      scope: "global",
      roomId: null,
      floor: null,
      note: "Wifi chung cả nhà, dùng cho khu vực sân và hành lang.",
    },
    {
      id: "wifi-2",
      ssid: "NhaTro-Tang1",
      password: "tang1@2024",
      scope: "floor",
      roomId: null,
      floor: 1,
      note: "Router đặt cuối hành lang tầng 1.",
    },
    {
      id: "wifi-3",
      ssid: "NhaTro-Tang2",
      password: "tang2@2024",
      scope: "floor",
      roomId: null,
      floor: 2,
      note: "Router đặt cuối hành lang tầng 2.",
    },
    {
      id: "wifi-4",
      ssid: "P203-Rieng",
      password: "p203rieng",
      scope: "room",
      roomId: "room-p203",
      floor: null,
      note: "Phòng lớn có đường truyền riêng.",
    },
  ];

  const passwords: Record<string, string> = {};
  for (const profile of profiles) {
    passwords[profile.id] = profile.role === "admin" ? "admin123" : "demo123";
  }

  return { profiles, rooms, tenancies, events, wifi, passwords, sequence: 100 };
}

const globalStore = globalThis as unknown as { __demoDb?: DemoDatabase };

export function demoDb(): DemoDatabase {
  if (!globalStore.__demoDb) {
    globalStore.__demoDb = seed();
  }
  return globalStore.__demoDb;
}

export function nextId(prefix: string) {
  const db = demoDb();
  db.sequence += 1;
  return `${prefix}-${db.sequence}`;
}

export function resetDemoDb() {
  globalStore.__demoDb = seed();
}
