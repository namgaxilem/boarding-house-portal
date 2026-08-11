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

export interface RoomPhoto {
  id: string;
  roomId: string;
  storagePath: string;
  /** URL công khai đầy đủ, dựng sẵn ở tầng adapter. */
  url: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

export type IdDocStatus = "pending" | "approved" | "rejected";

/**
 * Một lần người thuê gửi giấy tờ tuỳ thân lên để chủ trọ duyệt.
 *
 * Các trường ở đây là dữ liệu NGƯỜI THUÊ GỬI, chưa được duyệt. Bản chính thức
 * nằm ở `Profile.idNumber` và chỉ được ghi khi chủ trọ bấm duyệt.
 */
export interface IdDocument {
  id: string;
  profileId: string;
  status: IdDocStatus;

  idNumber: string | null;
  oldIdNumber: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  residence: string | null;
  issuedOn: string | null;

  /** Đường dẫn trong bucket riêng tư `id-photos`. KHÔNG phải URL xem được. */
  frontPath: string | null;
  backPath: string | null;

  source: "qr" | "manual";
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

/** Ảnh CCCD kèm URL đã ký, hạn rất ngắn. Chỉ dựng ngay trước khi render. */
export interface IdDocumentPhotos {
  frontUrl: string | null;
  backUrl: string | null;
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

/** Phòng kèm ảnh — dùng cho trang giới thiệu và trang chi tiết. */
export interface RoomWithPhotos extends Room {
  photos: RoomPhoto[];
}

export interface TenancyDetail extends Tenancy {
  room: Room;
  tenant: Profile;
}

/** Hàng chờ duyệt của chủ trọ — cần biết hồ sơ này là của ai. */
export interface IdDocumentWithTenant extends IdDocument {
  tenant: Pick<Profile, "id" | "fullName" | "email" | "idNumber">;
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
