import type {
  AdminStats,
  AdminTodo,
  AppNotification,
  GateCredential,
  IdDocument,
  IdDocumentPhotos,
  IdDocumentWithTenant,
  Invoice,
  InvoiceDetail,
  InvoiceStatus,
  MaintenancePhoto,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceRequestDetail,
  MaintenanceStatus,
  MeterReading,
  MeterReadingWithRoom,
  NotificationType,
  PaymentAccount,
  PaymentMethod,
  Profile,
  RevenueReport,
  RoomPhoto,
  RoomWithPhotos,
  Room,
  RoomEvent,
  RoomStatus,
  RoomWithOccupancy,
  Tenancy,
  TenancyDetail,
  TenantWithCurrentRoom,
  WifiNetwork,
} from "@/types";

/**
 * The single contract every storage backend implements.
 *
 * Pages and Server Actions depend on this interface, never on supabase-js or on
 * the demo store directly. Swapping the backend is one line in `db/index.ts`.
 */

export interface RoomInput {
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
}

export interface TenantInput {
  email: string;
  fullName: string;
  phone: string | null;
  /** CCCD/CMND — chỉ admin nhập và sửa. */
  idNumber: string | null;
  dateOfBirth: string | null;
  hometown: string | null;
  note: string | null;
}

/**
 * Dữ liệu người thuê gửi kèm ảnh CCCD.
 *
 * `idNumber` là bắt buộc — không có số thì chủ trọ chẳng duyệt được gì. Các
 * trường còn lại có thể thiếu: thẻ đời cũ không có đủ, và người dùng được phép
 * nhập tay khi mã QR mờ không quét nổi.
 */
export interface IdDocumentInput {
  idNumber: string;
  oldIdNumber: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  residence: string | null;
  issuedOn: string | null;
  source: "qr" | "manual";
}

export interface TenancyInput {
  roomId: string;
  tenantId: string;
  isPrimary: boolean;
  startDate: string;
  deposit: number;
  monthlyPrice: number;
}

export interface EndTenancyInput {
  endDate: string;
  endReason: string;
  terminated: boolean;

  /**
   * Kết toán cọc. Số trừ và số hoàn được lưu riêng chứ không suy ra từ nhau: chủ
   * trọ có thể trả lại ít hơn phần còn lại (trả làm hai lần) hoặc nhiều hơn (bớt
   * cho người ở lâu), và cả hai trường hợp đều phải tra lại được.
   */
  depositDeduction: number;
  depositRefunded: number;
  settlementNote: string | null;
}

export interface RoomEventInput {
  roomId: string;
  type: RoomEvent["type"];
  title: string;
  content: string | null;
  cost: number | null;
  occurredAt: string;
}

export interface WifiInput {
  ssid: string;
  password: string;
  scope: WifiNetwork["scope"];
  roomId: string | null;
  floor: number | null;
  note: string | null;
}

export interface RoomFilter {
  status?: RoomStatus | "all";
  floor?: number | "all";
  query?: string;
}

export interface MeterReadingInput {
  roomId: string;
  /** Ngày 01 của tháng — dùng `toPeriod()` để dựng, đừng tự ghép chuỗi. */
  period: string;
  electricStart: number;
  electricEnd: number;
  waterStart: number;
  waterEnd: number;
  note: string | null;
}

/**
 * Dữ liệu lập/sửa một hoá đơn.
 *
 * Số lượng và ĐƠN GIÁ đều nằm ở đây, không lấy lại từ `Room` lúc ghi: hoá đơn là
 * ảnh chụp, và người lập được phép sửa đơn giá cho riêng tháng đó (ví dụ tháng
 * đầu tiên tính nửa tiền phòng).
 */
export interface InvoiceInput {
  roomId: string;
  tenantId: string;
  tenancyId: string | null;
  readingId: string | null;
  period: string;
  rent: number;
  electricKwh: number;
  electricPrice: number;
  waterM3: number;
  waterPrice: number;
  serviceAmount: number;
  otherAmount: number;
  otherNote: string | null;
  discount: number;
  dueDate: string | null;
  note: string | null;
}

export interface InvoiceFilter {
  status?: InvoiceStatus | "all";
  period?: string;
  roomId?: string;
}

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  invoiceId: string | null;
}

export interface GateCredentialInput {
  gateCode: string | null;
  fingerprintSlot: string | null;
  note: string | null;
}

/**
 * Một cách nhận tiền.
 *
 * `kind` quyết định nửa nào của các trường bên dưới được dùng; phần còn lại phải
 * là null. Ràng buộc `payment_accounts_shape` trong database chốt lại điều đó,
 * nên một dòng nửa vời không lưu được kể cả khi gọi thẳng bằng SQL.
 */
export interface PaymentAccountInput {
  label: string;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  note: string | null;
  isActive: boolean;
}

export interface MaintenanceInput {
  roomId: string;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
}

export interface MaintenanceFilter {
  /** `"active"` = đang mở hoặc đang sửa — hàng chờ thật sự của chủ trọ. */
  status?: MaintenanceStatus | "active" | "all";
  roomId?: string;
}

export interface RecentEvent extends RoomEvent {
  room: Room;
}

/**
 * Deliberately narrow. A tenant may see who shares their room, but not that
 * person's phone number or the landlord's private note about them.
 */
export interface Roommate {
  id: string;
  fullName: string;
  startDate: string;
}

export interface Repository {
  /* rooms */
  listRooms(filter?: RoomFilter): Promise<RoomWithOccupancy[]>;
  getRoom(id: string): Promise<RoomWithOccupancy | null>;
  getRoomByCode(code: string): Promise<Room | null>;
  createRoom(input: RoomInput): Promise<Room>;
  updateRoom(id: string, input: RoomInput): Promise<Room>;
  deleteRoom(id: string): Promise<void>;
  listVacantRooms(): Promise<RoomWithPhotos[]>;

  /* ảnh phòng */
  listRoomPhotos(roomId: string): Promise<RoomPhoto[]>;
  /** Upload lên Storage rồi ghi lại một dòng. Trả về ảnh vừa thêm. */
  addRoomPhoto(roomId: string, file: File): Promise<RoomPhoto>;
  /** Xoá cả dòng trong bảng lẫn file trong bucket. */
  deleteRoomPhoto(photoId: string): Promise<void>;
  /** Đưa ảnh lên đầu danh sách — ảnh đầu chính là ảnh bìa. */
  setRoomCoverPhoto(photoId: string): Promise<void>;
  /** Đổi chỗ một ảnh với ảnh liền kề. `direction` = -1 lên, 1 xuống. */
  moveRoomPhoto(photoId: string, direction: -1 | 1): Promise<void>;

  /* tenants */
  listTenants(): Promise<TenantWithCurrentRoom[]>;
  /**
   * Chủ trọ đang hoạt động — người nhận thông báo khi có người thuê báo hỏng.
   *
   * Chạy bằng service-role: người gọi là một NGƯỜI THUÊ vừa gửi phiếu, và
   * `profiles_select` chỉ cho họ đọc dòng của chính mình.
   */
  listAdmins(): Promise<Profile[]>;
  getProfile(id: string): Promise<Profile | null>;
  getProfileByEmail(email: string): Promise<Profile | null>;
  getTenant(id: string): Promise<TenantWithCurrentRoom | null>;
  createTenant(input: TenantInput, password: string): Promise<Profile>;
  updateTenant(id: string, input: TenantInput): Promise<Profile>;
  setTenantActive(id: string, isActive: boolean): Promise<void>;
  deleteTenant(id: string): Promise<void>;
  updateOwnProfile(
    id: string,
    input: Pick<TenantInput, "fullName" | "phone" | "dateOfBirth" | "hometown">,
  ): Promise<Profile>;
  /**
   * Đổi họ tên và email của CHÍNH tài khoản đang đăng nhập.
   *
   * Tách khỏi `updateOwnProfile` vì email không phải một cột hồ sơ bình thường:
   * nó là danh tính đăng nhập, nằm ở `auth.users` LẪN `profiles`, và trigger
   * `handle_new_user` chỉ chạy lúc INSERT nên không tự đồng bộ. Sửa một bên thôi
   * là đăng nhập một đằng, hồ sơ một nẻo — và khớp tài khoản Google/Facebook
   * (vốn dò theo `profiles.email`) sẽ không tìm ra ai.
   *
   * Chạy bằng service-role: `auth.users` không sửa được từ phiên người dùng nếu
   * không đi qua luồng gửi email xác minh.
   */
  updateOwnAccount(
    id: string,
    input: { fullName: string; email: string },
  ): Promise<Profile>;

  /* giấy tờ tuỳ thân (CCCD) */
  /** Hồ sơ gần nhất của một người, kể cả đã duyệt hay bị từ chối. */
  getLatestIdDocument(profileId: string): Promise<IdDocument | null>;
  listIdDocuments(profileId: string): Promise<IdDocument[]>;
  /** Hàng chờ duyệt của chủ trọ. */
  listPendingIdDocuments(): Promise<IdDocumentWithTenant[]>;
  /** Tải ảnh lên bucket riêng tư rồi ghi một dòng ở trạng thái chờ duyệt. */
  createIdDocument(
    profileId: string,
    input: IdDocumentInput,
    front: File | null,
    back: File | null,
  ): Promise<IdDocument>;
  /** Xoá cả dòng lẫn ảnh. Người thuê chỉ xoá được hồ sơ chưa duyệt của mình. */
  deleteIdDocument(documentId: string): Promise<void>;
  /** Duyệt và chép số CCCD sang `profiles`, nguyên tử. Chỉ admin. */
  approveIdDocument(documentId: string): Promise<void>;
  rejectIdDocument(documentId: string, note: string): Promise<void>;
  /**
   * Ký URL tạm cho ảnh CCCD và ghi một dòng nhật ký truy cập.
   *
   * Gọi càng muộn càng tốt — URL ký ra hết hạn sau ít phút, ký sớm rồi cache lại
   * là vừa hỏng ảnh vừa mất ý nghĩa của việc để bucket riêng tư.
   */
  signIdDocumentPhotos(
    document: IdDocument,
    viewerId: string,
  ): Promise<IdDocumentPhotos>;

  /* tenancies */
  listTenanciesByRoom(roomId: string): Promise<TenancyDetail[]>;
  listTenanciesByTenant(tenantId: string): Promise<TenancyDetail[]>;
  getActiveTenancyForTenant(tenantId: string): Promise<TenancyDetail | null>;
  getTenancy(id: string): Promise<TenancyDetail | null>;
  createTenancy(input: TenancyInput): Promise<Tenancy>;
  endTenancy(id: string, input: EndTenancyInput): Promise<void>;
  /** Others currently living in the signed-in tenant's room. */
  listMyRoommates(userId: string): Promise<Roommate[]>;

  /* room events */
  listRoomEvents(roomId: string): Promise<RoomEvent[]>;
  createRoomEvent(input: RoomEventInput): Promise<RoomEvent>;
  deleteRoomEvent(id: string): Promise<void>;
  listRecentEvents(limit: number): Promise<RecentEvent[]>;

  /* wifi */
  listWifi(): Promise<WifiNetwork[]>;
  getWifiForRoom(roomId: string): Promise<WifiNetwork[]>;
  createWifi(input: WifiInput): Promise<WifiNetwork>;
  updateWifi(id: string, input: WifiInput): Promise<WifiNetwork>;
  deleteWifi(id: string): Promise<void>;

  /* chỉ số điện nước */
  /** Chỉ số của cả nhà trọ trong một tháng. */
  listMeterReadings(period: string): Promise<MeterReadingWithRoom[]>;
  /** Lịch sử chỉ số của một phòng, mới nhất trước. */
  listMeterReadingsForRoom(roomId: string, limit?: number): Promise<MeterReading[]>;
  getMeterReading(roomId: string, period: string): Promise<MeterReading | null>;
  /**
   * Chỉ số của kỳ gần nhất TRƯỚC `period`.
   *
   * Không phải "tháng liền trước": nhà trọ có thể bỏ trống một tháng không ghi,
   * và số đầu kỳ vẫn phải nối tiếp lần ghi cuối cùng chứ không tụt về 0.
   */
  getPreviousMeterReading(roomId: string, period: string): Promise<MeterReading | null>;
  /** Ghi mới hoặc ghi đè chỉ số của (phòng, kỳ). */
  saveMeterReading(input: MeterReadingInput): Promise<MeterReading>;
  deleteMeterReading(id: string): Promise<void>;

  /* hoá đơn */
  listInvoices(filter?: InvoiceFilter): Promise<InvoiceDetail[]>;
  listInvoicesForTenant(tenantId: string): Promise<InvoiceDetail[]>;
  getInvoice(id: string): Promise<InvoiceDetail | null>;
  createInvoice(input: InvoiceInput): Promise<Invoice>;
  updateInvoice(id: string, input: InvoiceInput): Promise<Invoice>;
  /**
   * Đổi trạng thái hoá đơn. Trả về hoá đơn kèm phòng và người thuê, vì mọi
   * lần đổi trạng thái đều kéo theo một thông báo cần biết gửi cho ai.
   */
  setInvoiceStatus(
    id: string,
    status: InvoiceStatus,
    options?: { paidMethod?: PaymentMethod | null },
  ): Promise<InvoiceDetail>;
  deleteInvoice(id: string): Promise<void>;
  /**
   * Hoá đơn đã phát hành, quá hạn tính đến `today` (yyyy-MM-dd).
   *
   * Chạy bằng service-role key: người gọi duy nhất là job cron nhắc hạn, lúc đó
   * không có ai đăng nhập nên RLS sẽ trả về 0 dòng nếu dùng client thường.
   */
  listOverdueInvoices(today: string): Promise<InvoiceDetail[]>;
  /** Hoá đơn này đã được nhắc hạn chưa. Cũng chạy bằng service-role, cho cron. */
  hasInvoiceDueReminder(invoiceId: string): Promise<boolean>;

  /* thông báo */
  listNotifications(userId: string, limit?: number): Promise<AppNotification[]>;
  countUnreadNotifications(userId: string): Promise<number>;
  /**
   * Tạo thông báo cho MỘT NGƯỜI KHÁC.
   *
   * Chạy bằng service-role key: người gửi có thể là chủ trọ (có quyền) nhưng
   * cũng có thể là job cron nhắc hạn — lúc đó không có ai đăng nhập cả.
   */
  createNotification(input: NotificationInput): Promise<AppNotification>;
  markNotificationEmailSent(id: string): Promise<void>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  /* mã cổng / vân tay — chỉ chủ trọ */
  getGateCredential(profileId: string): Promise<GateCredential | null>;
  saveGateCredential(
    profileId: string,
    input: GateCredentialInput,
  ): Promise<GateCredential>;
  deleteGateCredential(profileId: string): Promise<void>;

  /* cách nhận tiền — số tài khoản và ảnh QR chủ trọ tự thêm */
  /** Mặc định chỉ trả về dòng đang bật; chỉ trang cài đặt mới cần cả dòng đã tắt. */
  listPaymentAccounts(options?: { includeInactive?: boolean }): Promise<PaymentAccount[]>;
  getPaymentAccount(id: string): Promise<PaymentAccount | null>;
  createBankAccount(input: PaymentAccountInput): Promise<PaymentAccount>;
  /** Tải ảnh QR lên bucket công khai rồi ghi một dòng trỏ tới nó. */
  createQrAccount(
    input: Pick<PaymentAccountInput, "label" | "note" | "isActive">,
    file: File,
  ): Promise<PaymentAccount>;
  /**
   * Sửa phần chữ. Ảnh QR KHÔNG đổi được tại chỗ — muốn ảnh khác thì xoá dòng cũ
   * và thêm dòng mới, để không bao giờ có cảnh nhãn ghi một ngân hàng còn ảnh
   * quét ra một tài khoản khác.
   */
  updatePaymentAccount(id: string, input: PaymentAccountInput): Promise<PaymentAccount>;
  /** Xoá cả dòng lẫn ảnh QR trong bucket. */
  deletePaymentAccount(id: string): Promise<void>;
  /** Đổi chỗ với dòng liền kề. `direction` = -1 lên, 1 xuống. */
  movePaymentAccount(id: string, direction: -1 | 1): Promise<void>;

  /* báo hỏng */
  listMaintenanceRequests(filter?: MaintenanceFilter): Promise<MaintenanceRequestDetail[]>;
  /**
   * Phiếu người đang đăng nhập nhìn thấy: của phòng mình đang ở, cộng phiếu do
   * chính mình từng gửi. RLS quyết định, không lọc ở đây.
   */
  listMaintenanceRequestsForUser(userId: string): Promise<MaintenanceRequestDetail[]>;
  getMaintenanceRequest(id: string): Promise<MaintenanceRequestDetail | null>;
  createMaintenanceRequest(
    input: MaintenanceInput & { reportedBy: string },
  ): Promise<MaintenanceRequest>;
  /** Chủ trọ sửa mọi trường của phiếu. */
  updateMaintenanceRequest(
    id: string,
    input: MaintenanceInput,
  ): Promise<MaintenanceRequestDetail>;
  /**
   * Chủ trọ đổi trạng thái.
   *
   * `cost` không vào bảng phiếu mà thành một dòng `room_events` — người thuê đọc
   * được dòng phiếu của mình, và giá thợ báo không phải việc của họ.
   */
  setMaintenanceStatus(
    id: string,
    status: MaintenanceStatus,
    options?: { resolutionNote?: string | null; cost?: number | null },
  ): Promise<MaintenanceRequestDetail>;
  /** Người thuê sửa phiếu của chính mình, chỉ khi còn 'open'. Qua SQL function. */
  updateOwnMaintenanceRequest(id: string, input: Omit<MaintenanceInput, "roomId">): Promise<void>;
  /** Đóng phiếu. Chủ trọ đóng phiếu nào cũng được, người thuê chỉ phiếu của mình. */
  closeMaintenanceRequest(id: string, note: string | null): Promise<void>;
  deleteMaintenanceRequest(id: string): Promise<void>;

  /* ảnh đính kèm báo hỏng */
  /**
   * Ảnh của một phiếu, kèm URL đã ký.
   *
   * Gọi càng muộn càng tốt — URL ký ra hết hạn sau ít phút, ký sớm rồi cache lại
   * là vừa hỏng ảnh vừa mất ý nghĩa của việc để bucket riêng tư.
   */
  listMaintenancePhotos(requestId: string): Promise<MaintenancePhoto[]>;
  /** Tải một ảnh lên bucket riêng tư rồi ghi một dòng trỏ tới nó. */
  addMaintenancePhoto(
    requestId: string,
    uploaderId: string,
    file: File,
  ): Promise<MaintenancePhoto>;
  /** Xoá cả dòng lẫn file. RLS quyết định ai xoá được ảnh nào. */
  deleteMaintenancePhoto(photoId: string): Promise<void>;
  /** Đếm ảnh hiện có — để chặn trước khi vượt trần mỗi phiếu. */
  countMaintenancePhotos(requestId: string): Promise<number>;

  /* dashboard + báo cáo */
  getAdminStats(): Promise<AdminStats>;
  /** Việc tồn đọng. `period` là tháng dùng để kiểm phòng nào chưa ghi chỉ số. */
  getAdminTodo(period: string): Promise<AdminTodo>;
  /** Doanh thu theo tháng và theo phòng. `from`/`to` là kỳ, cả hai đầu đều tính. */
  getRevenueReport(from: string, to: string): Promise<RevenueReport>;
}
