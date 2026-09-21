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

/**
 * Vòng đời một bài viết.
 *
 * `archived` KHÔNG phải "đã xoá": dòng ở lại vĩnh viễn để giữ chỗ cho slug. Xoá
 * hẳn rồi để một bài mới trùng tiêu đề chiếm lại đúng URL đó là cách làm hỏng
 * chỉ mục Google mà không ai nhận ra.
 */
export type PostStatus = "draft" | "pending" | "published" | "rejected" | "archived";

/**
 * Ai đọc được bài.
 *
 * `internal` nghĩa là "dành cho người trong nhà", không phải "bí mật" — nó thừa
 * hưởng `robots: noIndex` của layout gốc. `public` là thứ duy nhất vào sitemap,
 * và CHỈ CHỦ TRỌ đặt được giá trị này (chốt ở WITH CHECK của `posts_insert_own`).
 */
export type PostVisibility = "public" | "internal";

export type NotificationType =
  | "invoice_issued"
  | "invoice_paid"
  | "invoice_due"
  | "maintenance_new"
  | "maintenance_update"
  | "gate_alert"
  | "gate_battery_low"
  | "gate_fingerprint_new"
  | "post_pending"
  | "post_reviewed"
  | "general";

/**
 * Vòng đời một mã cổng.
 *
 * `pending` và `revoking` KHÔNG phải trạng thái chờ thụ động — chúng chính là
 * hàng chờ của cron. Không có bảng job nào cả: việc còn nợ nằm ngay trong cột
 * `status` của dòng dữ liệu.
 */
export type GatePasscodeStatus =
  | "pending"
  | "active"
  | "revoking"
  | "revoked"
  | "failed";

export type GatePasscodeKind = "tenant" | "guest" | "staff";

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
  /**
   * Ngày hết hạn theo hợp đồng — DỰ ĐỊNH, khác `endDate` là ngày dọn đi THẬT.
   *
   * `null` với hợp đồng cũ ký trước khi có cột này, và với hợp đồng thuê không
   * kỳ hạn. Dùng để chặn trên hạn hiệu lực của mã cổng và để nhắc gia hạn.
   */
  expectedEndDate: string | null;
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

export interface PostImage {
  id: string;
  postId: string;
  /** Đường dẫn trong bucket công khai `post-images`, dạng "<postId>/<uuid>.webp". */
  storagePath: string;
  /** URL công khai dựng từ `storagePath`. */
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  /** Đường dẫn ảnh bìa trong bucket; `coverUrl` là bản dùng được. */
  coverPath: string | null;
  coverUrl: string | null;
  status: PostStatus;
  visibility: PostVisibility;
  /** NULL khi tài khoản tác giả đã bị xoá — `authorName` vẫn còn. */
  authorId: string | null;
  authorName: string;
  publishedAt: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostDetail extends Post {
  images: PostImage[];
}

/** Một trang kết quả. Chỉ `/blog` phân trang — xem docs/13-bai-viet.md. */
export interface PostPage {
  items: Post[];
  total: number;
  page: number;
  pageCount: number;
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

/* -------------------------------------------------------------------------- */
/*  Khoá cổng thông minh (TTLock)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Một ổ khoá vật lý.
 *
 * `batteryPercent` / `hasGateway` / `keyboardPwdVersion` là ảnh chụp của lần
 * đồng bộ gần nhất, KHÔNG phải sự thật thời gian thực — luôn hiển thị kèm
 * `lastSyncedAt`, nếu không chủ trọ sẽ tin một con số pin từ ba tuần trước.
 */
export interface GateLock {
  id: string;
  ttlockLockId: number;
  name: string;
  label: string | null;
  mac: string | null;
  /** `null` = cổng chung cả xóm. Có giá trị = khoá cửa một phòng cụ thể. */
  roomId: string | null;
  isPrimary: boolean;
  /** >= 4 mới đặt được mã tự chọn; 3 thì phải xin mã từ cloud TTLock. */
  keyboardPwdVersion: number | null;
  hasGateway: boolean;
  batteryPercent: number | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface GatePasscode {
  id: string;
  lockId: string;
  profileId: string;
  tenancyId: string | null;
  kind: GatePasscodeKind;
  code: string;
  /** Tên trên ổ khoá, dạng 'NT-P101-3f9a2c1b'. Xem `src/lib/gate.ts`. */
  remoteName: string;
  ttlockPasscodeId: number | null;
  status: GatePasscodeStatus;
  startAt: string;
  endAt: string;
  issuedAt: string | null;
  revokedAt: string | null;
  lastError: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
}

/** Mã kèm tên người và mã phòng — dạng dùng cho mọi bảng trong giao diện. */
export interface GatePasscodeDetail extends GatePasscode {
  tenantName: string;
  roomCode: string | null;
  /** Hợp đồng gắn với mã này còn hiệu lực không. Mã khách → `true`. */
  tenancyActive: boolean;
  expectedEndDate: string | null;
}

export interface GateFingerprint {
  id: string;
  lockId: string;
  ttlockFingerprintId: number;
  /** Tên ổ khoá tự báo. Thường vô nghĩa ('fingerprint 3'). */
  remoteName: string | null;
  /** `null` = ngăn lạ, chưa ai nhận. Đây là việc chủ trọ cần làm. */
  profileId: string | null;
  label: string | null;
  note: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  removedAt: string | null;
  updatedAt: string;
}

export interface GateFingerprintDetail extends GateFingerprint {
  tenantName: string | null;
  roomCode: string | null;
}

export interface GateEvent {
  id: string;
  lockId: string;
  ttlockRecordId: number;
  /** 1=app 3/12=gateway 4=mã bàn phím 7=thẻ từ 8=vân tay 10=chìa cơ 11=bluetooth */
  recordType: number;
  success: boolean;
  remoteUsername: string | null;
  profileId: string | null;
  passcodeId: string | null;
  fingerprintId: string | null;
  occurredAt: string;
}

export interface GateEventDetail extends GateEvent {
  tenantName: string | null;
}

/**
 * Một người đã trả phòng mà sổ vẫn còn ghi mã cổng / ngăn vân tay của họ.
 *
 * Không phải một bảng — là kết quả của phép trừ "ai có ghi chép" trừ "ai còn ở".
 * Việc phải làm bằng tay ngoài cổng; app chỉ có thể không cho quên.
 */
export interface GateCredentialToRevoke {
  profileId: string;
  fullName: string;
  gateCode: string | null;
  fingerprintSlot: string | null;
  note: string | null;
  /** Phòng ở lần cuối và ngày dọn đi, để chủ trọ nhớ ra người này là ai. */
  lastRoomCode: string | null;
  lastEndDate: string | null;
}

export interface IntegrationToken {
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  accountUid: string | null;
  updatedAt: string;
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

/* -------------------------------------------------------------------------- */
/*  Trợ lý Telegram                                                           */
/* -------------------------------------------------------------------------- */

/** Nơi một lời gọi tool đi vào. `web` để dành cho khi Server Action cũng ghi nhật ký. */
export type AgentChannel = "telegram" | "mcp" | "web";

export type AuditOutcome = "pending" | "ok" | "error" | "denied";

/**
 * Một máy Telegram đã gắn với một tài khoản.
 *
 * `chatId` là số của Telegram, không phải id nội bộ — nhưng nó KHÔNG BAO GIỜ tự
 * mình chứng minh được gì. Nó chỉ có nghĩa sau khi `redeem_telegram_link_code()`
 * xác nhận người cầm nó biết một mã sinh từ phiên web đang đăng nhập.
 */
export interface TelegramLink {
  chatId: number;
  profileId: string;
  telegramUsername: string | null;
  linkedAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

/** Ai đang nói chuyện với bot, đã xác minh vai. */
export interface TelegramActor {
  chatId: number;
  profile: SessionUser;
}

export interface AuditLogEntry {
  id: number;
  occurredAt: string;
  profileId: string | null;
  actorEmail: string;
  channel: AgentChannel;
  toolName: string;
  readOnly: boolean;
  args: Record<string, unknown>;
  outcome: AuditOutcome;
  errorCode: string | null;
  durationMs: number | null;
  requestId: string;
}

/** Số đã dùng trong NGÀY của một người. Trần tính bằng tiền, xem lib/agent/budget.ts. */
export interface AgentUsage {
  requests: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
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
  /** Bài viết người thuê đã gửi, đang chờ duyệt. */
  pendingPosts: number;
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
  /**
   * Người đã trả phòng mà mã cổng / ngăn vân tay vẫn còn ghi trong sổ.
   *
   * Cho tới trước khi có mục này, thứ DUY NHẤT chặn một người đã dọn đi khỏi cái
   * cổng là chủ trọ tự nhớ ra — `endTenancy()` không đụng gì tới
   * `gate_credentials`, và lời nhắc duy nhất là một câu chữ trong hộp thoại xoá.
   * Một con số nằm lì trên thanh điều hướng thì không quên được.
   */
  gateCredentialsToRevoke: string[];
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

/** Một dòng trong bảng dung lượng Storage — xem `storage_usage()`. */
export interface StorageBucketUsage {
  bucket: string;
  objectCount: number;
  totalBytes: number;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}
