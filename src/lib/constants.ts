import type {
  IdDocStatus,
  RoomEventType,
  RoomStatus,
  Role,
  TenancyStatus,
  WifiScope,
} from "@/types";

/**
 * All user-facing Vietnamese labels live here so copy changes are one-file edits
 * and no page hardcodes a string that another page spells differently.
 */

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  vacant: "Còn trống",
  occupied: "Đang ở",
  maintenance: "Đang sửa",
  reserved: "Đã giữ chỗ",
};

/** Tailwind classes per status. Kept as full class strings so JIT can see them. */
export const ROOM_STATUS_STYLE: Record<RoomStatus, string> = {
  vacant: "bg-secondary text-secondary-foreground border-border",
  occupied: "bg-success/12 text-success border-success/25",
  maintenance: "bg-warning/15 text-warning-foreground border-warning/30 dark:text-warning",
  reserved: "bg-info/12 text-info border-info/25",
};

export const ROOM_STATUS_DOT: Record<RoomStatus, string> = {
  vacant: "bg-muted-foreground/40",
  occupied: "bg-success",
  maintenance: "bg-warning",
  reserved: "bg-info",
};

export const ROOM_STATUS_OPTIONS = (
  Object.keys(ROOM_STATUS_LABEL) as RoomStatus[]
).map((value) => ({ value, label: ROOM_STATUS_LABEL[value] }));

export const TENANCY_STATUS_LABEL: Record<TenancyStatus, string> = {
  active: "Đang thuê",
  ended: "Đã kết thúc",
  terminated: "Chấm dứt sớm",
};

export const TENANCY_STATUS_STYLE: Record<TenancyStatus, string> = {
  active: "bg-success/12 text-success border-success/25",
  ended: "bg-secondary text-muted-foreground border-border",
  terminated: "bg-destructive/10 text-destructive border-destructive/25",
};

export const ROOM_EVENT_LABEL: Record<RoomEventType, string> = {
  checkin: "Nhận phòng",
  checkout: "Trả phòng",
  maintenance: "Sửa chữa",
  price_change: "Đổi giá",
  incident: "Sự cố",
  note: "Ghi chú",
};

export const ROOM_EVENT_OPTIONS = (
  Object.keys(ROOM_EVENT_LABEL) as RoomEventType[]
).map((value) => ({ value, label: ROOM_EVENT_LABEL[value] }));

export const ID_DOC_STATUS_LABEL: Record<IdDocStatus, string> = {
  pending: "Chờ chủ trọ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

export const ID_DOC_STATUS_STYLE: Record<IdDocStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30 dark:text-warning",
  approved: "bg-success/12 text-success border-success/25",
  rejected: "bg-destructive/10 text-destructive border-destructive/25",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Chủ trọ",
  tenant: "Người thuê",
};

export const WIFI_SCOPE_LABEL: Record<WifiScope, string> = {
  global: "Toàn nhà",
  floor: "Theo tầng",
  room: "Theo phòng",
};

export const END_REASON_OPTIONS = [
  "Hết hạn hợp đồng",
  "Chuyển đi nơi khác",
  "Chuyển sang phòng khác",
  "Vi phạm nội quy",
  "Lý do khác",
];

/** Where each role lands after login. */
export const HOME_PATH: Record<Role, string> = {
  admin: "/admin",
  tenant: "/me",
};
