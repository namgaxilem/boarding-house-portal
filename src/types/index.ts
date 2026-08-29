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

export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export type PaymentMethod = "cash" | "transfer";

/**
 * Cách chủ trọ nhận tiền.
 *
 * `bank` là số tài khoản gõ tay, `qr` là ảnh QR tải lên. Khác `PaymentMethod` ở
 * trên: cái đó là "đã thu bằng gì", cái này là "chuyển vào đâu".
 */
export type PaymentAccountKind = "bank" | "qr";

export type MaintenanceStatus = "open" | "in_progress" | "resolved" | "closed";

export type MaintenancePriority = "low" | "normal" | "urgent";

export type NotificationType =
  | "invoice_issued"
  | "invoice_paid"
  | "invoice_due"
  | "maintenance_new"
  | "maintenance_update"
  | "general";

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

  /**
   * Kết toán cọc lúc trả phòng. Bằng 0 khi hợp đồng còn hiệu lực.
   *
   * `deposit` là số nhận lúc ký và KHÔNG bao giờ đổi — hai cột này ghi lại phép
   * trừ, để sáu tháng sau còn tra được vì sao chỉ hoàn 1.500.000 trên 2.000.000.
   */
  depositDeduction: number;
  depositRefunded: number;
  settlementNote: string | null;

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

/**
 * Chỉ số đồng hồ điện nước của một phòng trong một tháng.
 *
 * `period` là ngày 01 của tháng (yyyy-MM-01) — một tháng chỉ có một cách viết.
 * Các cột `*Start`/`*End` là SỐ TRÊN ĐỒNG HỒ, không phải lượng tiêu thụ; lượng
 * dùng tính bằng `electricUsed()` / `waterUsed()` trong `@/lib/period`.
 */
export interface MeterReading {
  id: string;
  roomId: string;
  period: string;
  electricStart: number;
  electricEnd: number;
  waterStart: number;
  waterEnd: number;
  note: string | null;
  recordedAt: string;
  recordedBy: string | null;
}

/**
 * Hoá đơn tháng của một phòng.
 *
 * Mọi đơn giá ở đây là ảnh chụp lúc lập hoá đơn. Tăng giá điện tháng sau không
 * làm đổi con số của hoá đơn cũ — đừng bao giờ đọc lại giá từ `Room`.
 */
export interface Invoice {
  id: string;
  roomId: string;
  tenantId: string;
  tenancyId: string | null;
  readingId: string | null;
  period: string;

  rent: number;
  electricKwh: number;
  electricPrice: number;
  electricAmount: number;
  waterM3: number;
  waterPrice: number;
  waterAmount: number;
  serviceAmount: number;
  otherAmount: number;
  otherNote: string | null;
  discount: number;
  /** Cột sinh trong database — không tính lại ở client. */
  total: number;

  status: InvoiceStatus;
  dueDate: string | null;
  note: string | null;

  createdAt: string;
  createdBy: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  paidMethod: PaymentMethod | null;
}

/** Thông báo trong app. `emailSentAt` khác null nghĩa là đã gửi email kèm. */
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  invoiceId: string | null;
  readAt: string | null;
  emailSentAt: string | null;
  createdAt: string;
}

/**
 * Mã mở cổng / ngăn vân tay của một người thuê.
 *
 * CHỈ chủ trọ đọc được — RLS trên `gate_credentials` không có policy nào cho
 * người thuê, kể cả với dòng của chính họ. Đây là ghi chép nội bộ để chủ trọ
 * biết ngăn vân tay nào cần xoá khi có người trả phòng.
 */
export interface GateCredential {
  profileId: string;
  gateCode: string | null;
  fingerprintSlot: string | null;
  note: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

/**
 * Một cách nhận tiền: số tài khoản gõ tay, hoặc ảnh QR tải lên.
 *
 * Chủ trọ tự thêm bao nhiêu tuỳ ý (Vietcombank + MoMo + QR quầy tạp hoá…), khác
 * với `houseConfig.bank` vốn chỉ chứa được đúng một tài khoản và phải deploy lại
 * mới đổi được.
 */
export interface PaymentAccount {
  id: string;
  kind: PaymentAccountKind;
  label: string;

  /** Chỉ có khi `kind === "bank"`. */
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;

  /** Chỉ có khi `kind === "qr"`. Đường dẫn trong bucket, không phải URL. */
  qrPath: string | null;
  /** URL công khai đầy đủ, dựng sẵn ở tầng adapter. Null với dòng `bank`. */
  qrUrl: string | null;

  note: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

/**
 * Một phiếu báo hỏng.
 *
 * Khác `RoomEvent` ở chỗ đây là việc CHƯA XONG: nó có trạng thái, và cả hai bên
 * đều nhìn được cùng một trạng thái đó. `RoomEvent` là nhật ký của việc đã rồi.
 */
export interface MaintenanceRequest {
  id: string;
  roomId: string;
  reportedBy: string | null;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  /**
   * Chủ trọ ghi đã sửa gì, hoặc người thuê ghi vì sao tự đóng. Người thuê đọc
   * được — khác hẳn chi phí sửa, thứ nằm ở `RoomEvent.cost` (bảng admin-only).
   */
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  closedBy: string | null;
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

/** Chỉ số kèm phòng — bảng ghi điện nước của cả nhà trọ trong một tháng. */
export interface MeterReadingWithRoom extends MeterReading {
  room: Room;
}

/**
 * Một hàng trên trang ghi điện nước.
 *
 * `previous` là chỉ số tháng trước (nếu có) — dùng để điền sẵn số đầu kỳ, nên
 * chủ trọ chỉ phải gõ số cuối kỳ đang hiện trên đồng hồ.
 */
export interface RoomMeterRow {
  room: Room;
  occupantNames: string[];
  reading: MeterReading | null;
  previous: MeterReading | null;
}

export interface InvoiceDetail extends Invoice {
  room: Room;
  tenant: Pick<Profile, "id" | "fullName" | "email" | "phone">;
}

/**
 * Ảnh đính kèm một phiếu báo hỏng.
 *
 * `url` là URL ĐÃ KÝ, hạn ngắn — bucket riêng tư, không có URL công khai nào mở
 * được ảnh này. Ký ngay lúc render, đừng cache lại.
 */
export interface MaintenancePhoto {
  id: string;
  requestId: string;
  storagePath: string;
  url: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

/** Phiếu báo hỏng kèm phòng và người báo — dùng cho danh sách của chủ trọ. */
export interface MaintenanceRequestDetail extends MaintenanceRequest {
  room: Room;
  /** Null khi tài khoản người báo đã bị xoá. */
  reporter: Pick<Profile, "id" | "fullName"> | null;
}

export interface AdminStats {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  maintenanceRooms: number;
  activeTenants: number;
  monthlyRevenue: number;
  occupancyRate: number;
  /** Hoá đơn đã phát hành mà chưa thu được tiền. */
  unpaidInvoices: number;
  unpaidAmount: number;
}

/**
 * Việc đang chờ chủ trọ làm.
 *
 * Tách khỏi `AdminStats` vì hai thứ này được đọc ở hai chỗ khác nhau và với hai
 * nhịp khác nhau: stats chỉ ở trang tổng quan, còn số việc tồn hiện trên sidebar
 * của MỌI trang admin nên phải rẻ.
 */
export interface AdminTodo {
  /** Hoá đơn đã phát hành, quá hạn, chưa thu. */
  overdueInvoices: number;
  overdueAmount: number;
  /** Hoá đơn nháp chưa phát hành — người thuê chưa thấy gì. */
  draftInvoices: number;
  pendingIdDocuments: number;
  /** Phiếu báo hỏng ở trạng thái 'open' hoặc 'in_progress'. */
  openMaintenance: number;
  urgentMaintenance: number;
  /**
   * Kỳ đang xét cho `roomsMissingReading` (yyyy-MM-01).
   *
   * KHÔNG phải lúc nào cũng là tháng hiện tại: chỉ số đọc vào cuối tháng, nên
   * đầu tháng thì kỳ đáng hỏi là tháng trước. Xem `meterDuePeriod()`.
   */
  period: string;
  /** Mã phòng đang có người ở mà kỳ trên chưa ghi chỉ số điện nước. */
  roomsMissingReading: string[];
}

/** Một tháng trên báo cáo doanh thu. Tất cả suy ra từ bảng `invoices`. */
export interface RevenuePeriod {
  period: string;
  /**
   * Tổng hoá đơn ĐÃ PHÁT HÀNH của tháng đó (gồm cả đã thu và chưa thu). Hoá đơn
   * nháp và hoá đơn huỷ không tính — nháp thì người thuê chưa thấy, huỷ thì
   * không còn là tiền phải thu.
   */
  billed: number;
  /** Phần đã thực thu trong số trên. */
  collected: number;
  outstanding: number;
  invoiceCount: number;
  paidCount: number;
  electricKwh: number;
  waterM3: number;
}

export interface RevenueByRoom {
  roomId: string;
  roomCode: string;
  billed: number;
  collected: number;
  outstanding: number;
  invoiceCount: number;
}

export interface RevenueTotals {
  billed: number;
  collected: number;
  outstanding: number;
  invoiceCount: number;
  electricKwh: number;
  waterM3: number;
}

export interface RevenueReport {
  /** Kỳ đầu và kỳ cuối, dạng yyyy-MM-01. Cả hai đầu đều tính vào. */
  from: string;
  to: string;
  /** Đủ mọi tháng trong khoảng, kể cả tháng không có hoá đơn nào (số 0). */
  periods: RevenuePeriod[];
  rooms: RevenueByRoom[];
  totals: RevenueTotals;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}
