/**
 * Domain types.
 *
 * These are the shapes the UI works with. They are camelCase; the database is
 * snake_case. Mapping between the two happens in the data adapters
 * (`src/lib/db/*`) and nowhere else, so a schema rename never leaks into pages.
 */

export type Role = "admin" | "tenant";

export type RoomStatus = "vacant" | "occupied" | "maintenance" | "reserved";

export type TenancyStatus = "active" | "ended" | "terminated";

export type RoomEventType =
  | "checkin"
  | "checkout"
  | "maintenance"
  | "price_change"
  | "incident"
  | "note";

export type WifiScope = "global" | "floor" | "room";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  /**
   * Số CCCD/CMND. Dữ liệu cá nhân nhạy cảm — RLS chỉ cho chính chủ và admin
   * đọc, và người thuê không tự sửa được.
   */
  idNumber: string | null;
  dateOfBirth: string | null;
  hometown: string | null;
  note: string | null;
  /** Điền tự động lần đầu đăng nhập bằng Zalo. */
  zaloId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Room {
  id: string;
  code: string;
  floor: number;
  areaM2: number;
  basePrice: number;
  electricPrice: number;
  waterPrice: number;
  servicePrice: number;
  maxOccupants: number;
  status: RoomStatus;
  description: string | null;
  createdAt: string;
}

export interface Tenancy {
  id: string;
  roomId: string;
  tenantId: string;
  isPrimary: boolean;
  startDate: string;
  endDate: string | null;
  deposit: number;
  /** Snapshot of the rent agreed at signing. Never re-read from `Room`. */
  monthlyPrice: number;
  status: TenancyStatus;
  endReason: string | null;
  createdAt: string;
}

export interface RoomEvent {
  id: string;
  roomId: string;
  type: RoomEventType;
  title: string;
  content: string | null;
  cost: number | null;
  occurredAt: string;
  createdBy: string | null;
}

export interface WifiNetwork {
  id: string;
  ssid: string;
  password: string;
  scope: WifiScope;
  roomId: string | null;
  floor: number | null;
  note: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Composed read models                                                      */
/* -------------------------------------------------------------------------- */

export interface Occupant {
  tenancy: Tenancy;
  tenant: Profile;
}

export interface RoomWithOccupancy extends Room {
  occupants: Occupant[];
}

export interface TenancyDetail extends Tenancy {
  room: Room;
  tenant: Profile;
}

export interface TenantWithCurrentRoom extends Profile {
  currentTenancy: Tenancy | null;
  currentRoom: Room | null;
}

export interface AdminStats {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  maintenanceRooms: number;
  activeTenants: number;
  monthlyRevenue: number;
  occupancyRate: number;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}
