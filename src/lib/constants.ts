import type {
  IdDocStatus,
  InvoiceStatus,
  MaintenancePriority,
  MaintenanceStatus,
  NotificationType,
  PaymentAccountKind,
  PaymentMethod,
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

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Nháp",
  issued: "Chờ thanh toán",
  paid: "Đã thu",
  void: "Đã huỷ",
};

export const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: "bg-secondary text-muted-foreground border-border",
  issued: "bg-warning/15 text-warning-foreground border-warning/30 dark:text-warning",
  paid: "bg-success/12 text-success border-success/25",
  void: "bg-destructive/10 text-destructive border-destructive/25",
};

export const INVOICE_STATUS_OPTIONS = (
  Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[]
).map((value) => ({ value, label: INVOICE_STATUS_LABEL[value] }));

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};

export const PAYMENT_METHOD_OPTIONS = (
  Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]
).map((value) => ({ value, label: PAYMENT_METHOD_LABEL[value] }));

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  invoice_issued: "Hoá đơn mới",
  invoice_paid: "Đã nhận thanh toán",
  invoice_due: "Nhắc đóng tiền",
  maintenance_new: "Báo hỏng mới",
  maintenance_update: "Cập nhật báo hỏng",
  general: "Thông báo",
};

/* --------------------------------------------------------------- báo hỏng */

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  open: "Chờ xử lý",
  in_progress: "Đang sửa",
  resolved: "Đã sửa xong",
  closed: "Đã đóng",
};

export const MAINTENANCE_STATUS_STYLE: Record<MaintenanceStatus, string> = {
  open: "bg-warning/15 text-warning-foreground border-warning/30 dark:text-warning",
  in_progress: "bg-info/12 text-info border-info/25",
  resolved: "bg-success/12 text-success border-success/25",
  closed: "bg-secondary text-muted-foreground border-border",
};

/**
 * Trạng thái chủ trọ được phép đặt. `closed` không nằm ở đây: đóng phiếu đi qua
 * một nút riêng, cho cả hai bên, nên nó không phải một lựa chọn trong dropdown.
 */
export const MAINTENANCE_STATUS_OPTIONS = (
  ["open", "in_progress", "resolved"] as MaintenanceStatus[]
).map((value) => ({ value, label: MAINTENANCE_STATUS_LABEL[value] }));

export const MAINTENANCE_PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  low: "Không gấp",
  normal: "Bình thường",
  urgent: "Khẩn cấp",
};

export const MAINTENANCE_PRIORITY_STYLE: Record<MaintenancePriority, string> = {
  low: "bg-secondary text-muted-foreground border-border",
  normal: "bg-secondary text-secondary-foreground border-border",
  urgent: "bg-destructive/10 text-destructive border-destructive/25",
};

export const MAINTENANCE_PRIORITY_OPTIONS = (
  Object.keys(MAINTENANCE_PRIORITY_LABEL) as MaintenancePriority[]
).map((value) => ({ value, label: MAINTENANCE_PRIORITY_LABEL[value] }));

/** Gợi ý sẵn cho ô tiêu đề — người thuê gõ trên điện thoại, chọn nhanh hơn gõ. */
export const MAINTENANCE_SUGGESTIONS = [
  "Vòi nước rò/hỏng",
  "Bồn cầu tắc",
  "Mất điện / chập điện",
  "Bình nóng lạnh không nóng",
  "Điều hoà không mát",
  "Khoá cửa hỏng",
  "Bóng đèn cháy",
  "Thấm dột trần/tường",
  "Wifi không vào được",
];

/* ------------------------------------------------------- cách nhận tiền */

export const PAYMENT_ACCOUNT_KIND_LABEL: Record<PaymentAccountKind, string> = {
  bank: "Số tài khoản",
  qr: "Ảnh QR",
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
