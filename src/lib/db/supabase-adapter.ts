import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { todayInHouseTz } from "@/lib/format";
import { lineAmount } from "@/lib/period";
import type {
  AdminStats,
  AdminTodo,
  AppNotification,
  GateCredential,
  IdDocStatus,
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
  PaymentAccountKind,
  PaymentMethod,
  Profile,
  RevenueByRoom,
  RevenuePeriod,
  RevenueReport,
  Room,
  RoomEvent,
  RoomPhoto,
  RoomStatus,
  RoomWithOccupancy,
  RoomWithPhotos,
  Tenancy,
  TenancyDetail,
  TenantWithCurrentRoom,
  WifiNetwork,
} from "@/types";

import type {
  EndTenancyInput,
  GateCredentialInput,
  IdDocumentInput,
  InvoiceFilter,
  InvoiceInput,
  MaintenanceFilter,
  MaintenanceInput,
  MeterReadingInput,
  NotificationInput,
  PaymentAccountInput,
  RecentEvent,
  Repository,
  RoomEventInput,
  RoomFilter,
  RoomInput,
  TenancyInput,
  TenantInput,
  WifiInput,
} from "./repository";

/* -------------------------------------------------------------------------- */
/*  Row shapes (snake_case, as Postgres returns them)                         */
/* -------------------------------------------------------------------------- */

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "tenant";
  id_number: string | null;
  date_of_birth: string | null;
  hometown: string | null;
  note: string | null;
  zalo_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface RoomRow {
  id: string;
  code: string;
  floor: number;
  area_m2: number | string;
  base_price: number | string;
  electric_price: number | string;
  water_price: number | string;
  service_price: number | string;
  max_occupants: number;
  status: RoomStatus;
  description: string | null;
  created_at: string;
}

interface TenancyRow {
  id: string;
  room_id: string;
  tenant_id: string;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  deposit: number | string;
  monthly_price: number | string;
  status: Tenancy["status"];
  end_reason: string | null;
  deposit_deduction: number | string;
  deposit_refunded: number | string;
  settlement_note: string | null;
  created_at: string;
}

interface RoomEventRow {
  id: string;
  room_id: string;
  type: RoomEvent["type"];
  title: string;
  content: string | null;
  cost: number | string | null;
  occurred_at: string;
  created_by: string | null;
}

interface RoomPhotoRow {
  id: string;
  room_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

interface IdDocumentRow {
  id: string;
  profile_id: string;
  status: IdDocStatus;
  id_number: string | null;
  old_id_number: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  residence: string | null;
  issued_on: string | null;
  front_path: string | null;
  back_path: string | null;
  source: "qr" | "manual";
  review_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface WifiRow {
  id: string;
  ssid: string;
  password: string;
  scope: WifiNetwork["scope"];
  room_id: string | null;
  floor: number | null;
  note: string | null;
}

interface MeterReadingRow {
  id: string;
  room_id: string;
  period: string;
  electric_start: number | string;
  electric_end: number | string;
  water_start: number | string;
  water_end: number | string;
  note: string | null;
  recorded_at: string;
  recorded_by: string | null;
}

interface InvoiceRow {
  id: string;
  room_id: string;
  tenant_id: string;
  tenancy_id: string | null;
  reading_id: string | null;
  period: string;
  rent: number | string;
  electric_kwh: number | string;
  electric_price: number | string;
  electric_amount: number | string;
  water_m3: number | string;
  water_price: number | string;
  water_amount: number | string;
  service_amount: number | string;
  other_amount: number | string;
  other_note: string | null;
  discount: number | string;
  total: number | string;
  status: InvoiceStatus;
  due_date: string | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
  issued_at: string | null;
  paid_at: string | null;
  paid_method: PaymentMethod | null;
}

/** Người thuê nhúng kèm hoá đơn — đúng bốn cột cần để hiện và để gửi email. */
interface InvoiceTenantRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  invoice_id: string | null;
  read_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

interface GateCredentialRow {
  profile_id: string;
  gate_code: string | null;
  fingerprint_slot: string | null;
  note: string | null;
  updated_at: string;
  updated_by: string | null;
}

interface PaymentAccountRow {
  id: string;
  kind: PaymentAccountKind;
  label: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  qr_path: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface MaintenancePhotoRow {
  id: string;
  request_id: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}

interface MaintenanceRow {
  id: string;
  room_id: string;
  reported_by: string | null;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Mappers                                                                   */
/* -------------------------------------------------------------------------- */

/** PostgREST can hand back `numeric` as a string once values get large. */
function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    idNumber: row.id_number,
    dateOfBirth: row.date_of_birth,
    hometown: row.hometown,
    note: row.note,
    zaloId: row.zalo_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    floor: row.floor,
    areaM2: num(row.area_m2),
    basePrice: num(row.base_price),
    electricPrice: num(row.electric_price),
    waterPrice: num(row.water_price),
    servicePrice: num(row.service_price),
    maxOccupants: row.max_occupants,
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
  };
}

function toTenancy(row: TenancyRow): Tenancy {
  return {
    id: row.id,
    roomId: row.room_id,
    tenantId: row.tenant_id,
    isPrimary: row.is_primary,
    startDate: row.start_date,
    endDate: row.end_date,
    deposit: num(row.deposit),
    monthlyPrice: num(row.monthly_price),
    status: row.status,
    endReason: row.end_reason,
    depositDeduction: num(row.deposit_deduction),
    depositRefunded: num(row.deposit_refunded),
    settlementNote: row.settlement_note,
    createdAt: row.created_at,
  };
}

function toRoomEvent(row: RoomEventRow): RoomEvent {
  return {
    id: row.id,
    roomId: row.room_id,
    type: row.type,
    title: row.title,
    content: row.content,
    cost: row.cost === null ? null : num(row.cost),
    occurredAt: row.occurred_at,
    createdBy: row.created_by,
  };
}

/**
 * Bucket ảnh QR nhận tiền. Public như `room-photos`, KHÔNG private như
 * `id-photos`: mã QR là thứ chủ trọ muốn càng nhiều người quét càng tốt, và nó
 * chỉ mã hoá đúng số tài khoản vốn đã in trên mọi hoá đơn.
 */
export const PAYMENT_QR_BUCKET = "payment-qr";

/**
 * Ảnh đính kèm phiếu báo hỏng. RIÊNG TƯ.
 *
 * Khác `room-photos` (quảng cáo) và `payment-qr` (càng nhiều người quét càng
 * tốt): đây là ảnh chụp trong phòng người ta ở — cái bồn rửa, góc bếp, đôi khi
 * cả đồ đạc cá nhân lọt vào khung hình. Chỉ mở được bằng URL ký hạn ngắn.
 *
 * Không có hàm dựng URL công khai ở đây, và cũng đừng thêm.
 */
export const MAINTENANCE_PHOTO_BUCKET = "maintenance-photos";

/**
 * Hạn URL ký cho ảnh báo hỏng — 10 phút.
 *
 * Rộng hơn 2 phút của ảnh CCCD, cố ý: một phiếu có thể có nhiều ảnh và chủ trọ
 * mở ra xem kỹ, phóng to, so với ảnh khác. Vẫn ngắn hơn nhiều so với "chia sẻ
 * link cho người ngoài xem" — mức nhạy cảm ở đây là ảnh cái vòi nước, không
 * phải giấy tờ tuỳ thân.
 */
const MAINTENANCE_PHOTO_URL_TTL_SECONDS = 600;

export const ROOM_PHOTO_BUCKET = "room-photos";

/**
 * Bucket là public nên URL dựng được bằng chuỗi thuần, không cần ký và không
 * hết hạn — đúng thứ `next/image` và thẻ og:image cần.
 */
function publicPhotoUrl(storagePath: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/${ROOM_PHOTO_BUCKET}/${storagePath}`;
}

function toRoomPhoto(row: RoomPhotoRow): RoomPhoto {
  return {
    id: row.id,
    roomId: row.room_id,
    storagePath: row.storage_path,
    url: publicPhotoUrl(row.storage_path),
    caption: row.caption,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function publicQrUrl(storagePath: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/${PAYMENT_QR_BUCKET}/${storagePath}`;
}

function toPaymentAccount(row: PaymentAccountRow): PaymentAccount {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountHolder: row.account_holder,
    qrPath: row.qr_path,
    qrUrl: row.qr_path ? publicQrUrl(row.qr_path) : null,
    note: row.note,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function toMaintenancePhoto(
  row: MaintenancePhotoRow,
  url: string | null,
): MaintenancePhoto {
  return {
    id: row.id,
    requestId: row.request_id,
    storagePath: row.storage_path,
    url,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

function toMaintenanceRequest(row: MaintenanceRow): MaintenanceRequest {
  return {
    id: row.id,
    roomId: row.room_id,
    reportedBy: row.reported_by,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    closedBy: row.closed_by,
  };
}

/**
 * Bucket RIÊNG TƯ. Khác `room-photos` ở đúng chỗ quan trọng nhất: không có hàm
 * dựng URL công khai ở đây, và cũng không được thêm. Muốn xem ảnh phải ký
 * (`signIdDocumentPhotos`).
 */
export const ID_PHOTO_BUCKET = "id-photos";

/** URL ký sống 2 phút — đủ để trình duyệt tải ảnh, không đủ để chia sẻ lại. */
const ID_PHOTO_URL_TTL_SECONDS = 120;

function toIdDocument(row: IdDocumentRow): IdDocument {
  return {
    id: row.id,
    profileId: row.profile_id,
    status: row.status,
    idNumber: row.id_number,
    oldIdNumber: row.old_id_number,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    residence: row.residence,
    issuedOn: row.issued_on,
    frontPath: row.front_path,
    backPath: row.back_path,
    source: row.source,
    reviewNote: row.review_note,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

function toWifi(row: WifiRow): WifiNetwork {
  return {
    id: row.id,
    ssid: row.ssid,
    password: row.password,
    scope: row.scope,
    roomId: row.room_id,
    floor: row.floor,
    note: row.note,
  };
}

function toMeterReading(row: MeterReadingRow): MeterReading {
  return {
    id: row.id,
    roomId: row.room_id,
    period: row.period,
    electricStart: num(row.electric_start),
    electricEnd: num(row.electric_end),
    waterStart: num(row.water_start),
    waterEnd: num(row.water_end),
    note: row.note,
    recordedAt: row.recorded_at,
    recordedBy: row.recorded_by,
  };
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    roomId: row.room_id,
    tenantId: row.tenant_id,
    tenancyId: row.tenancy_id,
    readingId: row.reading_id,
    period: row.period,
    rent: num(row.rent),
    electricKwh: num(row.electric_kwh),
    electricPrice: num(row.electric_price),
    electricAmount: num(row.electric_amount),
    waterM3: num(row.water_m3),
    waterPrice: num(row.water_price),
    waterAmount: num(row.water_amount),
    serviceAmount: num(row.service_amount),
    otherAmount: num(row.other_amount),
    otherNote: row.other_note,
    discount: num(row.discount),
    total: num(row.total),
    status: row.status,
    dueDate: row.due_date,
    note: row.note,
    createdAt: row.created_at,
    createdBy: row.created_by,
    issuedAt: row.issued_at,
    paidAt: row.paid_at,
    paidMethod: row.paid_method,
  };
}

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    invoiceId: row.invoice_id,
    readAt: row.read_at,
    emailSentAt: row.email_sent_at,
    createdAt: row.created_at,
  };
}

function toGateCredential(row: GateCredentialRow): GateCredential {
  return {
    profileId: row.profile_id,
    gateCode: row.gate_code,
    fingerprintSlot: row.fingerprint_slot,
    note: row.note,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function roomToRow(input: RoomInput) {
  return {
    code: input.code,
    floor: input.floor,
    area_m2: input.areaM2,
    base_price: input.basePrice,
    electric_price: input.electricPrice,
    water_price: input.waterPrice,
    service_price: input.servicePrice,
    max_occupants: input.maxOccupants,
    status: input.status,
    description: input.description,
  };
}

function wifiToRow(input: WifiInput) {
  return {
    ssid: input.ssid,
    password: input.password,
    scope: input.scope,
    room_id: input.roomId,
    floor: input.floor,
    note: input.note,
  };
}

function meterReadingToRow(input: MeterReadingInput) {
  return {
    room_id: input.roomId,
    period: input.period,
    electric_start: input.electricStart,
    electric_end: input.electricEnd,
    water_start: input.waterStart,
    water_end: input.waterEnd,
    note: input.note,
  };
}

/**
 * Tiền của từng khoản được tính TẠI ĐÂY, không nhận từ form.
 *
 * Form gửi lên số lượng và đơn giá; nếu tin luôn số tiền do client gửi thì một
 * request tự tay có thể ghi "300 kWh × 3.800 đ = 5 đồng". Tổng tiền thì thậm chí
 * không có trong INSERT — `invoices.total` là cột sinh trong database.
 */
function invoiceToRow(input: InvoiceInput) {
  return {
    room_id: input.roomId,
    tenant_id: input.tenantId,
    tenancy_id: input.tenancyId,
    reading_id: input.readingId,
    period: input.period,
    rent: input.rent,
    electric_kwh: input.electricKwh,
    electric_price: input.electricPrice,
    electric_amount: lineAmount(input.electricKwh, input.electricPrice),
    water_m3: input.waterM3,
    water_price: input.waterPrice,
    water_amount: lineAmount(input.waterM3, input.waterPrice),
    service_amount: input.serviceAmount,
    other_amount: input.otherAmount,
    other_note: input.otherAmount > 0 ? input.otherNote : null,
    discount: input.discount,
    due_date: input.dueDate,
    note: input.note,
  };
}

/** Cột select dùng chung cho mọi truy vấn hoá đơn cần hiện phòng + người thuê. */
const INVOICE_SELECT =
  "*, rooms(*), profiles!invoices_tenant_id_fkey(id, full_name, email, phone)";

function mapInvoiceDetails(rows: unknown): InvoiceDetail[] {
  const typed = (rows ?? []) as (InvoiceRow & {
    rooms: RoomRow | null;
    profiles: InvoiceTenantRow | null;
  })[];

  return typed
    .filter((row) => row.rooms !== null && row.profiles !== null)
    .map<InvoiceDetail>((row) => ({
      ...toInvoice(row),
      room: toRoom(row.rooms!),
      tenant: {
        id: row.profiles!.id,
        fullName: row.profiles!.full_name,
        email: row.profiles!.email,
        phone: row.profiles!.phone,
      },
    }));
}

/**
 * Người báo hỏng lấy đúng hai cột.
 *
 * Không `profiles(*)`: RLS đã cho người thuê đọc dòng phiếu của phòng mình, và
 * một join rộng sẽ kéo theo số điện thoại lẫn ghi chú riêng của chủ trọ về người
 * ở cùng phòng — cùng cái bẫy mà `my_roommates()` được viết ra để tránh.
 */
const MAINTENANCE_SELECT =
  "*, rooms(*), profiles!maintenance_requests_reported_by_fkey(id, full_name)";

function mapMaintenanceDetails(rows: unknown): MaintenanceRequestDetail[] {
  const typed = (rows ?? []) as (MaintenanceRow & {
    rooms: RoomRow | null;
    profiles: { id: string; full_name: string } | null;
  })[];

  return typed
    .filter((row) => row.rooms !== null)
    .map<MaintenanceRequestDetail>((row) => ({
      ...toMaintenanceRequest(row),
      room: toRoom(row.rooms!),
      reporter: row.profiles
        ? { id: row.profiles.id, fullName: row.profiles.full_name }
        : null,
    }));
}

/** Kỳ kế tiếp, thuần chuỗi — dựng khung tháng cho báo cáo mà không đụng Date. */
function nextPeriodString(period: string): string {
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

/** Dòng mới xuống cuối danh sách, không tự cướp chỗ cách nhận tiền đang ưu tiên. */
async function nextPaymentSortOrder(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_accounts")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.sort_order as number | undefined) ?? -1) + 1;
}

/**
 * Translate Postgres errors into the codes the Server Actions already handle,
 * so the same user-facing message appears in demo mode and Supabase mode.
 */
function rethrow(error: PostgrestError | null, fallback: string): never {
  if (error?.code === "23505") {
    if (error.message.includes("rooms_code")) throw new Error("DUPLICATE_ROOM_CODE");
    if (error.message.includes("one_active_per_tenant")) {
      throw new Error("TENANT_ALREADY_RENTING");
    }
    if (error.message.includes("email")) throw new Error("DUPLICATE_EMAIL");
  }
  if (error?.code === "23505") {
    if (error.message.includes("one_pending_per_profile")) {
      throw new Error("ID_DOCUMENT_PENDING_EXISTS");
    }
    if (error.message.includes("id_number")) throw new Error("DUPLICATE_ID_NUMBER");
    if (error.message.includes("phone")) throw new Error("DUPLICATE_PHONE");
  }
  if (error?.code === "23505") {
    if (error.message.includes("invoices_room_period")) {
      throw new Error("DUPLICATE_INVOICE");
    }
    if (error.message.includes("meter_readings_room_period")) {
      throw new Error("DUPLICATE_METER_READING");
    }
  }
  if (error?.code === "23514") {
    if (error.message.includes("id_number_format")) throw new Error("INVALID_ID_NUMBER");
    if (error.message.includes("phone_format")) throw new Error("INVALID_PHONE");
    if (error.message.includes("electric_forward") || error.message.includes("water_forward")) {
      throw new Error("METER_READING_BACKWARDS");
    }
    if (error.message.includes("other_needs_note")) throw new Error("INVOICE_OTHER_NEEDS_NOTE");
    if (error.message.includes("deduction_within_deposit")) {
      throw new Error("DEDUCTION_OVER_DEPOSIT");
    }
    if (error.message.includes("deduction_needs_note")) throw new Error("DEDUCTION_NEEDS_NOTE");
  }
  if (error?.code === "23503") throw new Error("ROOM_NOT_FOUND");

  // Lỗi do `raise exception` trong SQL function (close_maintenance_request,
  // update_my_maintenance_request). PostgREST gói nguyên chuỗi vào `message`,
  // và các mã đó đã là mã app dùng — ném thẳng ra để describeError() dịch.
  const raised = error?.message?.match(/\b(MAINTENANCE_[A-Z_]+)\b/);
  if (raised) throw new Error(raised[1]);

  throw new Error(error?.message ?? fallback);
}

/* -------------------------------------------------------------------------- */
/*  Shared read helpers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Occupancy is derived, never stored.
 *
 * `rooms.status` only carries the landlord's manual intent — "maintenance" or
 * "reserved". Whether a room is occupied comes from whether an active tenancy
 * exists, so the two can never disagree.
 */
function effectiveStatus(room: Room, activeCount: number): RoomStatus {
  if (room.status === "maintenance" || room.status === "reserved") return room.status;
  return activeCount > 0 ? "occupied" : "vacant";
}

/**
 * Rooms + their current occupants.
 *
 * Deliberately two round-trips instead of one embedded select: filtering an
 * embedded resource in PostgREST turns the join inner, which would silently drop
 * every empty room — exactly the rows a landlord most wants to see.
 */
async function loadRoomsWithOccupancy(roomIds?: string[]) {
  const supabase = await createClient();

  let roomQuery = supabase.from("rooms").select("*").order("code");
  if (roomIds) roomQuery = roomQuery.in("id", roomIds);

  const { data: roomRows, error: roomError } = await roomQuery;
  if (roomError) rethrow(roomError, "Không đọc được danh sách phòng");

  const rooms = (roomRows as RoomRow[]).map(toRoom);
  if (rooms.length === 0) return [];

  const { data: tenancyRows, error: tenancyError } = await supabase
    .from("tenancies")
    .select("*, profiles(*)")
    .is("end_date", null)
    .in(
      "room_id",
      rooms.map((r) => r.id),
    );
  if (tenancyError) rethrow(tenancyError, "Không đọc được hợp đồng đang hiệu lực");

  const byRoom = new Map<string, RoomWithOccupancy["occupants"]>();
  for (const row of (tenancyRows ?? []) as (TenancyRow & {
    profiles: ProfileRow | null;
  })[]) {
    if (!row.profiles) continue;
    const list = byRoom.get(row.room_id) ?? [];
    list.push({ tenancy: toTenancy(row), tenant: toProfile(row.profiles) });
    byRoom.set(row.room_id, list);
  }

  return rooms.map<RoomWithOccupancy>((room) => {
    const occupants = (byRoom.get(room.id) ?? []).sort(
      (a, b) => Number(b.tenancy.isPrimary) - Number(a.tenancy.isPrimary),
    );
    return { ...room, status: effectiveStatus(room, occupants.length), occupants };
  });
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

/* -------------------------------------------------------------------------- */
/*  Adapter                                                                   */
/* -------------------------------------------------------------------------- */

export const supabaseAdapter: Repository = {
  /* ---------------------------------------------------------------- rooms */

  async listRooms(filter: RoomFilter = {}) {
    let rooms = await loadRoomsWithOccupancy();

    if (filter.status && filter.status !== "all") {
      rooms = rooms.filter((r) => r.status === filter.status);
    }
    if (filter.floor !== undefined && filter.floor !== "all") {
      rooms = rooms.filter((r) => r.floor === filter.floor);
    }
    if (filter.query?.trim()) {
      const q = normalize(filter.query.trim());
      rooms = rooms.filter(
        (r) =>
          normalize(r.code).includes(q) ||
          normalize(r.description ?? "").includes(q) ||
          r.occupants.some((o) => normalize(o.tenant.fullName).includes(q)),
      );
    }
    return rooms;
  },

  async getRoom(id) {
    const rooms = await loadRoomsWithOccupancy([id]);
    return rooms[0] ?? null;
  },

  async getRoomByCode(code) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .ilike("code", code)
      .maybeSingle();
    if (error) rethrow(error, "Không tìm được phòng");
    return data ? toRoom(data as RoomRow) : null;
  },

  async createRoom(input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .insert(roomToRow(input))
      .select("*")
      .single();
    if (error) rethrow(error, "Không tạo được phòng");
    return toRoom(data as RoomRow);
  },

  async updateRoom(id, input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .update(roomToRow(input))
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được phòng");
    return toRoom(data as RoomRow);
  },

  async deleteRoom(id) {
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from("tenancies")
      .select("id", { count: "exact", head: true })
      .eq("room_id", id)
      .is("end_date", null);
    if (countError) rethrow(countError, "Không kiểm tra được hợp đồng của phòng");
    if ((count ?? 0) > 0) throw new Error("ROOM_OCCUPIED");

    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được phòng");
  },

  async listVacantRooms(): Promise<RoomWithPhotos[]> {
    const supabase = await createClient();

    // An RPC, not a table read: this powers the public landing page, where the
    // caller is `anon`. Anon has no grant on `tenancies` — and granting one
    // would be worse, since RLS would return zero rows and every occupied room
    // would look available. The SECURITY DEFINER function computes vacancy
    // server-side and returns only room columns.
    const { data, error } = await supabase.rpc("vacant_rooms");
    if (error) rethrow(error, "Không đọc được danh sách phòng trống");

    const rooms = (data as RoomRow[]).map(toRoom);
    if (rooms.length === 0) return [];

    const { data: photoRows, error: photoError } = await supabase
      .from("room_photos")
      .select("*")
      .in("room_id", rooms.map((room) => room.id))
      .order("sort_order");
    if (photoError) rethrow(photoError, "Không đọc được ảnh phòng");

    const byRoom = new Map<string, RoomPhoto[]>();
    for (const row of (photoRows ?? []) as RoomPhotoRow[]) {
      const list = byRoom.get(row.room_id) ?? [];
      list.push(toRoomPhoto(row));
      byRoom.set(row.room_id, list);
    }

    return rooms.map((room) => ({ ...room, photos: byRoom.get(room.id) ?? [] }));
  },

  /* ---------------------------------------------------------- ảnh phòng --- */

  async listRoomPhotos(roomId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("room_photos")
      .select("*")
      .eq("room_id", roomId)
      .order("sort_order");
    if (error) rethrow(error, "Không đọc được ảnh phòng");
    return (data as RoomPhotoRow[]).map(toRoomPhoto);
  },

  async addRoomPhoto(roomId, file) {
    const supabase = await createClient();

    const extension =
      { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" }[file.type] ??
      "jpg";
    const storagePath = `${roomId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(ROOM_PHOTO_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw new Error(
        /row-level security|Unauthorized/i.test(uploadError.message)
          ? "PHOTO_UPLOAD_FORBIDDEN"
          : `Không tải được ảnh lên: ${uploadError.message}`,
      );
    }

    // Ảnh mới xuống cuối danh sách, không tự cướp chỗ ảnh bìa đang có.
    const { data: last } = await supabase
      .from("room_photos")
      .select("sort_order")
      .eq("room_id", roomId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("room_photos")
      .insert({
        room_id: roomId,
        storage_path: storagePath,
        sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1,
      })
      .select("*")
      .single();

    if (error) {
      // Ghi bảng hỏng thì file vừa lên thành rác vĩnh viễn — dọn ngay.
      await supabase.storage.from(ROOM_PHOTO_BUCKET).remove([storagePath]);
      rethrow(error, "Không lưu được ảnh");
    }

    return toRoomPhoto(data as RoomPhotoRow);
  },

  async deleteRoomPhoto(photoId) {
    const supabase = await createClient();

    const { data: photo, error: findError } = await supabase
      .from("room_photos")
      .select("storage_path")
      .eq("id", photoId)
      .maybeSingle();
    if (findError) rethrow(findError, "Không tìm được ảnh");
    if (!photo) return;

    const { error } = await supabase.from("room_photos").delete().eq("id", photoId);
    if (error) rethrow(error, "Không xoá được ảnh");

    // Xoá file SAU khi xoá dòng: nếu làm ngược lại mà xoá dòng lỗi thì giao diện
    // còn ảnh nhưng file đã mất, hiện ra ảnh vỡ.
    await supabase.storage
      .from(ROOM_PHOTO_BUCKET)
      .remove([photo.storage_path as string]);
  },

  async setRoomCoverPhoto(photoId) {
    const supabase = await createClient();

    const { data: photo, error: findError } = await supabase
      .from("room_photos")
      .select("id, room_id")
      .eq("id", photoId)
      .maybeSingle();
    if (findError) rethrow(findError, "Không tìm được ảnh");
    if (!photo) return;

    const { data: siblings, error: listError } = await supabase
      .from("room_photos")
      .select("id")
      .eq("room_id", photo.room_id as string)
      .order("sort_order");
    if (listError) rethrow(listError, "Không đọc được danh sách ảnh");

    // Đánh số lại toàn bộ với ảnh được chọn ở vị trí 0. Rẻ hơn nghĩ cách khéo —
    // một phòng chỉ có vài ảnh.
    const ordered = [
      photoId,
      ...(siblings as { id: string }[]).map((s) => s.id).filter((id) => id !== photoId),
    ];

    for (const [index, id] of ordered.entries()) {
      const { error } = await supabase
        .from("room_photos")
        .update({ sort_order: index })
        .eq("id", id);
      if (error) rethrow(error, "Không đặt được ảnh bìa");
    }
  },

  async moveRoomPhoto(photoId, direction) {
    const supabase = await createClient();

    const { data: photo, error: findError } = await supabase
      .from("room_photos")
      .select("id, room_id")
      .eq("id", photoId)
      .maybeSingle();
    if (findError) rethrow(findError, "Không tìm được ảnh");
    if (!photo) return;

    const { data: siblings, error: listError } = await supabase
      .from("room_photos")
      .select("id")
      .eq("room_id", photo.room_id as string)
      .order("sort_order");
    if (listError) rethrow(listError, "Không đọc được danh sách ảnh");

    const ids = (siblings as { id: string }[]).map((s) => s.id);
    const from = ids.indexOf(photoId);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= ids.length) return;

    [ids[from], ids[to]] = [ids[to], ids[from]];

    for (const [index, id] of ids.entries()) {
      const { error } = await supabase
        .from("room_photos")
        .update({ sort_order: index })
        .eq("id", id);
      if (error) rethrow(error, "Không đổi được thứ tự ảnh");
    }
  },

  /* ------------------------------------------------- giấy tờ tuỳ thân --- */

  async getLatestIdDocument(profileId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("id_documents")
      .select("*")
      .eq("profile_id", profileId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hồ sơ giấy tờ");
    return data ? toIdDocument(data as IdDocumentRow) : null;
  },

  async listIdDocuments(profileId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("id_documents")
      .select("*")
      .eq("profile_id", profileId)
      .order("submitted_at", { ascending: false });
    if (error) rethrow(error, "Không đọc được hồ sơ giấy tờ");
    return (data as IdDocumentRow[]).map(toIdDocument);
  },

  async listPendingIdDocuments() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("id_documents")
      .select("*, profiles!id_documents_profile_id_fkey(id, full_name, email, id_number)")
      .eq("status", "pending")
      .order("submitted_at");
    if (error) rethrow(error, "Không đọc được hàng chờ duyệt");

    type Row = IdDocumentRow & {
      profiles: Pick<ProfileRow, "id" | "full_name" | "email" | "id_number"> | null;
    };

    return (data as Row[])
      // Hồ sơ mà join không ra người là dữ liệu mồ côi (tài khoản vừa bị xoá
      // trong lúc đang chờ duyệt). Bỏ qua thay vì render một thẻ trống.
      .filter((row) => row.profiles !== null)
      .map<IdDocumentWithTenant>((row) => ({
        ...toIdDocument(row),
        tenant: {
          id: row.profiles!.id,
          fullName: row.profiles!.full_name,
          email: row.profiles!.email,
          idNumber: row.profiles!.id_number,
        },
      }));
  },

  async createIdDocument(profileId, input: IdDocumentInput, front, back) {
    const supabase = await createClient();

    // Đường dẫn PHẢI bắt đầu bằng profileId: policy `id_photos_insert` so thư
    // mục cấp một với auth.uid(). Đổi quy ước đặt tên ở đây thì phải sửa cả
    // migration 0006.
    const uploaded: string[] = [];

    async function upload(file: File | null, side: "front" | "back") {
      if (!file) return null;

      const extension =
        { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" }[file.type] ??
        "jpg";
      const storagePath = `${profileId}/${crypto.randomUUID()}-${side}.${extension}`;

      const { error } = await supabase.storage
        .from(ID_PHOTO_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (error) {
        throw new Error(
          /row-level security|Unauthorized/i.test(error.message)
            ? "ID_PHOTO_UPLOAD_FORBIDDEN"
            : `Không tải được ảnh lên: ${error.message}`,
        );
      }

      uploaded.push(storagePath);
      return storagePath;
    }

    /** Ảnh đã lên mà bước sau hỏng thì chúng thành rác vĩnh viễn trong bucket. */
    async function cleanup() {
      if (uploaded.length > 0) {
        await supabase.storage.from(ID_PHOTO_BUCKET).remove(uploaded);
      }
    }

    let frontPath: string | null = null;
    let backPath: string | null = null;

    try {
      frontPath = await upload(front, "front");
      backPath = await upload(back, "back");
    } catch (error) {
      await cleanup();
      throw error;
    }

    const { data, error } = await supabase
      .from("id_documents")
      .insert({
        profile_id: profileId,
        status: "pending",
        id_number: input.idNumber,
        old_id_number: input.oldIdNumber,
        full_name: input.fullName,
        date_of_birth: input.dateOfBirth,
        gender: input.gender,
        residence: input.residence,
        issued_on: input.issuedOn,
        front_path: frontPath,
        back_path: backPath,
        source: input.source,
      })
      .select("*")
      .single();

    if (error) {
      await cleanup();
      rethrow(error, "Không lưu được hồ sơ giấy tờ");
    }

    return toIdDocument(data as IdDocumentRow);
  },

  async deleteIdDocument(documentId) {
    const supabase = await createClient();

    const { data: document, error: findError } = await supabase
      .from("id_documents")
      .select("front_path, back_path")
      .eq("id", documentId)
      .maybeSingle();
    if (findError) rethrow(findError, "Không tìm được hồ sơ");
    if (!document) return;

    const { error } = await supabase.from("id_documents").delete().eq("id", documentId);
    if (error) rethrow(error, "Không xoá được hồ sơ");

    const paths = [document.front_path, document.back_path].filter(
      (path): path is string => Boolean(path),
    );
    if (paths.length > 0) {
      await supabase.storage.from(ID_PHOTO_BUCKET).remove(paths);
    }
  },

  async approveIdDocument(documentId) {
    const supabase = await createClient();

    // Đi qua hàm SQL chứ không tự update hai bảng: chép số CCCD sang `profiles`
    // và đổi trạng thái phải cùng thành công. Xem approve_id_document() ở 0006.
    const { error } = await supabase.rpc("approve_id_document", {
      p_document_id: documentId,
    });

    if (error) {
      for (const code of [
        "ID_DOCUMENT_NOT_FOUND",
        "ID_DOCUMENT_ALREADY_REVIEWED",
        "ID_DOCUMENT_NO_NUMBER",
      ]) {
        if (error.message.includes(code)) throw new Error(code);
      }
      // Người thuê khai trùng số CCCD với người khác — unique index trên
      // `profiles` bắn 23505 từ bên trong hàm.
      rethrow(error, "Không duyệt được hồ sơ giấy tờ");
    }
  },

  async rejectIdDocument(documentId, note) {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("id_documents")
      .update({
        status: "rejected",
        review_note: note,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      })
      .eq("id", documentId)
      // Chỉ từ chối hồ sơ còn đang chờ. Bấm hai lần, hoặc bấm sau khi tab khác
      // vừa duyệt, thì câu lệnh này không khớp dòng nào thay vì lật ngược quyết định.
      .eq("status", "pending");

    if (error) rethrow(error, "Không từ chối được hồ sơ");
  },

  async signIdDocumentPhotos(document, viewerId): Promise<IdDocumentPhotos> {
    const supabase = await createClient();

    const paths = [document.frontPath, document.backPath].filter(
      (path): path is string => Boolean(path),
    );
    if (paths.length === 0) return { frontUrl: null, backUrl: null };

    const { data, error } = await supabase.storage
      .from(ID_PHOTO_BUCKET)
      .createSignedUrls(paths, ID_PHOTO_URL_TTL_SECONDS);

    // `rethrow` chỉ hiểu lỗi của PostgREST; Storage trả về kiểu khác hẳn.
    if (error) throw new Error(`Không mở được ảnh giấy tờ: ${error.message}`);

    const byPath = new Map(
      (data ?? []).map((entry) => [entry.path ?? "", entry.signedUrl ?? null]),
    );

    // Ghi nhật ký: ai mở ảnh giấy tờ của ai, lúc nào (Nghị định 13/2023).
    // Ghi ở đây vì đây là chỗ duy nhất biết chắc một lượt xem đang xảy ra. Đổi
    // lại, React render lại component có thể sinh thêm một dòng trùng —
    // chấp nhận được với một sổ chỉ-ghi-thêm, sai lệch về phía "ghi thừa".
    await supabase.from("id_document_access_log").insert({
      document_id: document.id,
      viewer_id: viewerId,
    });

    return {
      frontUrl: document.frontPath ? (byPath.get(document.frontPath) ?? null) : null,
      backUrl: document.backPath ? (byPath.get(document.backPath) ?? null) : null,
    };
  },

  /* -------------------------------------------------------------- tenants */

  async listTenants() {
    const supabase = await createClient();

    const { data: profileRows, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "tenant")
      .order("full_name");
    if (error) rethrow(error, "Không đọc được danh sách người thuê");

    const profiles = (profileRows as ProfileRow[]).map(toProfile);
    if (profiles.length === 0) return [];

    const { data: tenancyRows, error: tenancyError } = await supabase
      .from("tenancies")
      .select("*, rooms(*)")
      .is("end_date", null)
      .in(
        "tenant_id",
        profiles.map((p) => p.id),
      );
    if (tenancyError) rethrow(tenancyError, "Không đọc được hợp đồng");

    const byTenant = new Map<string, { tenancy: Tenancy; room: Room | null }>();
    for (const row of (tenancyRows ?? []) as (TenancyRow & { rooms: RoomRow | null })[]) {
      byTenant.set(row.tenant_id, {
        tenancy: toTenancy(row),
        room: row.rooms ? toRoom(row.rooms) : null,
      });
    }

    return profiles
      .map<TenantWithCurrentRoom>((profile) => {
        const current = byTenant.get(profile.id);
        return {
          ...profile,
          currentTenancy: current?.tenancy ?? null,
          currentRoom: current?.room ?? null,
        };
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return Number(b.isActive) - Number(a.isActive);
        return a.fullName.localeCompare(b.fullName, "vi");
      });
  },

  async getProfile(id) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hồ sơ");
    return data ? toProfile(data as ProfileRow) : null;
  },

  async getProfileByEmail(email) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", email)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hồ sơ");
    return data ? toProfile(data as ProfileRow) : null;
  },

  async getTenant(id) {
    const supabase = await createClient();

    const { data: profileRow, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("role", "tenant")
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hồ sơ người thuê");
    if (!profileRow) return null;

    const { data: tenancyRow, error: tenancyError } = await supabase
      .from("tenancies")
      .select("*, rooms(*)")
      .eq("tenant_id", id)
      .is("end_date", null)
      .maybeSingle();
    if (tenancyError) rethrow(tenancyError, "Không đọc được hợp đồng");

    const typed = tenancyRow as (TenancyRow & { rooms: RoomRow | null }) | null;
    return {
      ...toProfile(profileRow as ProfileRow),
      currentTenancy: typed ? toTenancy(typed) : null,
      currentRoom: typed?.rooms ? toRoom(typed.rooms) : null,
    };
  },

  async createTenant(input: TenantInput, password: string) {
    // Creating an auth user requires the service role; the anon key cannot.
    const admin = createAdminClient();

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone,
        role: "tenant",
      },
    });
    if (authError || !created.user) {
      if (authError?.message.toLowerCase().includes("already")) {
        throw new Error("DUPLICATE_EMAIL");
      }
      throw new Error(authError?.message ?? "Không tạo được tài khoản");
    }

    // The `on_auth_user_created` trigger inserted the base profile; fill the rest.
    const { data, error } = await admin
      .from("profiles")
      .update({
        full_name: input.fullName,
        phone: input.phone,
        id_number: input.idNumber,
        date_of_birth: input.dateOfBirth,
        hometown: input.hometown,
        note: input.note,
      })
      .eq("id", created.user.id)
      .select("*")
      .single();

    if (error) {
      // Do not leave an auth user with no usable profile behind.
      await admin.auth.admin.deleteUser(created.user.id);
      rethrow(error, "Không lưu được hồ sơ người thuê");
    }
    return toProfile(data as ProfileRow);
  },

  async updateTenant(id, input: TenantInput) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        id_number: input.idNumber,
        date_of_birth: input.dateOfBirth,
        hometown: input.hometown,
        note: input.note,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được hồ sơ");

    // Keep the auth record's email in step with the profile.
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(id, { email: input.email });

    return toProfile(data as ProfileRow);
  },

  async setTenantActive(id, isActive) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) rethrow(error, "Không đổi được trạng thái tài khoản");

    // Also block sign-in at the auth layer, not just in the app's own check.
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(id, {
      ban_duration: isActive ? "none" : "876000h",
    });
  },

  async deleteTenant(id) {
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from("tenancies")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", id)
      .is("end_date", null);
    if (countError) rethrow(countError, "Không kiểm tra được hợp đồng");
    if ((count ?? 0) > 0) throw new Error("TENANT_HAS_ACTIVE_TENANCY");

    // Deleting the auth user cascades to `profiles` and `tenancies`.
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
  },

  async updateOwnProfile(id, input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: input.fullName,
        phone: input.phone,
        date_of_birth: input.dateOfBirth,
        hometown: input.hometown,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được thông tin");
    return toProfile(data as ProfileRow);
  },

  async updateOwnAccount(id, input) {
    const supabase = createAdminClient();

    const { data: current, error: readError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", id)
      .maybeSingle();
    if (readError) rethrow(readError, "Không đọc được tài khoản");
    if (!current) throw new Error("TENANT_NOT_FOUND");

    const emailChanged = (current.email as string) !== input.email;

    // `auth.users` TRƯỚC, `profiles` sau.
    //
    // Thứ tự này quan trọng: email trùng bị chặn ở `auth.users` (Supabase Auth
    // giữ ràng buộc riêng của nó). Ghi `profiles` trước rồi mới vỡ ở auth là
    // hồ sơ mang email mới còn đăng nhập vẫn bằng email cũ — trạng thái không ai
    // phát hiện ra cho tới lần đăng nhập sau.
    if (emailChanged) {
      // Hỏi TRƯỚC xem email đã có ai dùng chưa, thay vì đoán từ thông báo lỗi.
      //
      // GoTrue trả lỗi trùng email của `updateUserById` với message RỖNG (`{}`,
      // status 500) — không có chữ nào để so khớp. Bắt lỗi kiểu đó là người dùng
      // nhận về "Không cập nhật được tài khoản", đúng nhưng vô dụng: họ không
      // biết phải sửa gì.
      //
      // Có kẽ hở lý thuyết giữa lúc hỏi và lúc ghi, nhưng ràng buộc unique ở
      // database vẫn chặn — kẽ hở đó chỉ làm thông báo xấu đi, không làm sai dữ
      // liệu. Nhà trọ mười phòng với một tài khoản chủ trọ thì nó không xảy ra.
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", input.email)
        .maybeSingle();
      if (taken && (taken.id as string) !== id) throw new Error("DUPLICATE_EMAIL");

      // `email_confirm: true` là bắt buộc. Thiếu nó, Supabase giữ email mới ở
      // cột `new_email` chờ người dùng bấm link xác minh, và tài khoản vẫn đăng
      // nhập bằng email cũ — lệnh chạy xong mà thực ra chưa đổi gì.
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        email: input.email,
        email_confirm: true,
      });
      if (authError) {
        if (authError.message?.toLowerCase().includes("already")) {
          throw new Error("DUPLICATE_EMAIL");
        }
        // `|| ...`: message rỗng thì đừng ném ra chuỗi rỗng cho người dùng đọc.
        throw new Error(authError.message || "Không đổi được email đăng nhập.");
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: input.fullName, email: input.email })
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được tài khoản");

    return toProfile(data as ProfileRow);
  },

  /* ------------------------------------------------------------ tenancies */

  async listTenanciesByRoom(roomId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenancies")
      .select("*, rooms(*), profiles(*)")
      .eq("room_id", roomId)
      .order("start_date", { ascending: false });
    if (error) rethrow(error, "Không đọc được lịch sử phòng");
    return mapTenancyDetails(data);
  },

  async listTenanciesByTenant(tenantId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenancies")
      .select("*, rooms(*), profiles(*)")
      .eq("tenant_id", tenantId)
      .order("start_date", { ascending: false });
    if (error) rethrow(error, "Không đọc được lịch sử thuê");
    return mapTenancyDetails(data);
  },

  async getActiveTenancyForTenant(tenantId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenancies")
      .select("*, rooms(*), profiles(*)")
      .eq("tenant_id", tenantId)
      .is("end_date", null)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hợp đồng hiện tại");
    return data ? (mapTenancyDetails([data])[0] ?? null) : null;
  },

  async getTenancy(id) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tenancies")
      .select("*, rooms(*), profiles(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hợp đồng");
    return data ? (mapTenancyDetails([data])[0] ?? null) : null;
  },

  async createTenancy(input: TenancyInput) {
    const supabase = await createClient();

    const room = await supabaseAdapter.getRoom(input.roomId);
    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.occupants.length >= room.maxOccupants) throw new Error("ROOM_FULL");

    const { data, error } = await supabase
      .from("tenancies")
      .insert({
        room_id: input.roomId,
        tenant_id: input.tenantId,
        is_primary: input.isPrimary,
        start_date: input.startDate,
        deposit: input.deposit,
        monthly_price: input.monthlyPrice,
        status: "active",
      })
      .select("*")
      .single();
    if (error) rethrow(error, "Không tạo được hợp đồng");

    if (room.status === "reserved") {
      await supabase.from("rooms").update({ status: "occupied" }).eq("id", room.id);
    }

    const tenant = await supabaseAdapter.getProfile(input.tenantId);
    await supabase.from("room_events").insert({
      room_id: input.roomId,
      type: "checkin",
      title: `${tenant?.fullName ?? "Người thuê"} nhận phòng`,
      occurred_at: new Date(input.startDate).toISOString(),
    });

    return toTenancy(data as TenancyRow);
  },

  async endTenancy(id, input: EndTenancyInput) {
    const supabase = await createClient();

    const tenancy = await supabaseAdapter.getTenancy(id);
    if (!tenancy) throw new Error("TENANCY_NOT_FOUND");
    if (tenancy.endDate !== null) throw new Error("TENANCY_ALREADY_ENDED");
    if (input.endDate < tenancy.startDate) throw new Error("END_BEFORE_START");

    if (input.depositDeduction > tenancy.deposit) throw new Error("DEDUCTION_OVER_DEPOSIT");
    if (input.depositDeduction > 0 && !input.settlementNote) {
      throw new Error("DEDUCTION_NEEDS_NOTE");
    }

    const { error } = await supabase
      .from("tenancies")
      .update({
        end_date: input.endDate,
        end_reason: input.endReason,
        status: input.terminated ? "terminated" : "ended",
        deposit_deduction: input.depositDeduction,
        deposit_refunded: input.depositRefunded,
        settlement_note: input.settlementNote,
      })
      .eq("id", id);
    if (error) rethrow(error, "Không kết thúc được hợp đồng");

    // Kết toán cọc đi vào nhật ký phòng luôn. Ba tháng sau, câu hỏi "sao phòng
    // này chỉ hoàn 1.5 triệu" được trả lời ở chỗ người ta tìm — trang phòng —
    // chứ không phải trong một hợp đồng đã đóng.
    const settlement =
      input.depositDeduction > 0
        ? ` Trừ cọc ${input.depositDeduction.toLocaleString("vi-VN")}đ, hoàn ${input.depositRefunded.toLocaleString("vi-VN")}đ.`
        : ` Hoàn đủ cọc ${input.depositRefunded.toLocaleString("vi-VN")}đ.`;

    await supabase.from("room_events").insert({
      room_id: tenancy.roomId,
      type: "checkout",
      title: `${tenancy.tenant.fullName} trả phòng`,
      content: [input.endReason + settlement, input.settlementNote]
        .filter(Boolean)
        .join(" — "),
      occurred_at: new Date(input.endDate).toISOString(),
    });
  },

  async listMyRoommates() {
    const supabase = await createClient();

    // A SECURITY DEFINER function rather than a table read: RLS filters rows, not
    // columns, so selecting `profiles` directly would expose the landlord's
    // private note and the roommate's phone number alongside the name.
    const { data, error } = await supabase.rpc("my_roommates");
    if (error) rethrow(error, "Không đọc được danh sách người ở cùng");

    return ((data ?? []) as { id: string; full_name: string; start_date: string }[]).map(
      (row) => ({ id: row.id, fullName: row.full_name, startDate: row.start_date }),
    );
  },

  /* ---------------------------------------------------------- room events */

  async listRoomEvents(roomId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("room_events")
      .select("*")
      .eq("room_id", roomId)
      .order("occurred_at", { ascending: false });
    if (error) rethrow(error, "Không đọc được nhật ký phòng");
    return (data as RoomEventRow[]).map(toRoomEvent);
  },

  async createRoomEvent(input: RoomEventInput) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("room_events")
      .insert({
        room_id: input.roomId,
        type: input.type,
        title: input.title,
        content: input.content,
        cost: input.cost,
        occurred_at: input.occurredAt,
      })
      .select("*")
      .single();
    if (error) rethrow(error, "Không ghi được nhật ký");
    return toRoomEvent(data as RoomEventRow);
  },

  async deleteRoomEvent(id) {
    const supabase = await createClient();
    const { error } = await supabase.from("room_events").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được ghi chú");
  },

  async listRecentEvents(limit) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("room_events")
      .select("*, rooms(*)")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) rethrow(error, "Không đọc được hoạt động gần đây");

    return ((data ?? []) as (RoomEventRow & { rooms: RoomRow | null })[])
      .filter((row) => row.rooms !== null)
      .map<RecentEvent>((row) => ({ ...toRoomEvent(row), room: toRoom(row.rooms!) }));
  },

  /* ----------------------------------------------------------------- wifi */

  async listWifi() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("wifi_networks").select("*").order("ssid");
    if (error) rethrow(error, "Không đọc được danh sách wifi");

    const rank = { global: 0, floor: 1, room: 2 };
    return (data as WifiRow[])
      .map(toWifi)
      .sort((a, b) => rank[a.scope] - rank[b.scope] || a.ssid.localeCompare(b.ssid));
  },

  async getWifiForRoom(roomId) {
    const supabase = await createClient();

    const { data: roomRow } = await supabase
      .from("rooms")
      .select("id, floor")
      .eq("id", roomId)
      .maybeSingle();
    if (!roomRow) return [];

    // RLS already limits a tenant to their own scopes; this filter keeps an
    // admin (who can see everything) from getting other rooms' networks here.
    const { data, error } = await supabase
      .from("wifi_networks")
      .select("*")
      .or(`scope.eq.global,room_id.eq.${roomId},and(scope.eq.floor,floor.eq.${roomRow.floor})`);
    if (error) rethrow(error, "Không đọc được wifi của phòng");

    const rank = { room: 0, floor: 1, global: 2 };
    return (data as WifiRow[]).map(toWifi).sort((a, b) => rank[a.scope] - rank[b.scope]);
  },

  async createWifi(input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wifi_networks")
      .insert(wifiToRow(input))
      .select("*")
      .single();
    if (error) rethrow(error, "Không thêm được wifi");
    return toWifi(data as WifiRow);
  },

  async updateWifi(id, input) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wifi_networks")
      .update(wifiToRow(input))
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được wifi");
    return toWifi(data as WifiRow);
  },

  async deleteWifi(id) {
    const supabase = await createClient();
    const { error } = await supabase.from("wifi_networks").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được wifi");
  },

  /* ------------------------------------------------- chỉ số điện nước */

  async listMeterReadings(period) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("meter_readings")
      .select("*, rooms(*)")
      .eq("period", period);
    if (error) rethrow(error, "Không đọc được chỉ số điện nước");

    return ((data ?? []) as (MeterReadingRow & { rooms: RoomRow | null })[])
      .filter((row) => row.rooms !== null)
      .map<MeterReadingWithRoom>((row) => ({
        ...toMeterReading(row),
        room: toRoom(row.rooms!),
      }))
      .sort((a, b) => a.room.code.localeCompare(b.room.code));
  },

  async listMeterReadingsForRoom(roomId, limit = 12) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("meter_readings")
      .select("*")
      .eq("room_id", roomId)
      .order("period", { ascending: false })
      .limit(limit);
    if (error) rethrow(error, "Không đọc được lịch sử chỉ số của phòng");
    return (data as MeterReadingRow[]).map(toMeterReading);
  },

  async getMeterReading(roomId, period) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("meter_readings")
      .select("*")
      .eq("room_id", roomId)
      .eq("period", period)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được chỉ số của phòng");
    return data ? toMeterReading(data as MeterReadingRow) : null;
  },

  async getPreviousMeterReading(roomId, period) {
    const supabase = await createClient();
    // `lt` chứ không phải "tháng liền trước": tháng nào chủ trọ quên ghi thì số
    // đầu kỳ vẫn phải nối tiếp lần ghi cuối cùng, không tụt về 0.
    const { data, error } = await supabase
      .from("meter_readings")
      .select("*")
      .eq("room_id", roomId)
      .lt("period", period)
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được chỉ số kỳ trước");
    return data ? toMeterReading(data as MeterReadingRow) : null;
  },

  async saveMeterReading(input: MeterReadingInput) {
    const supabase = await createClient();
    // upsert theo (room_id, period): ghi lại chỉ số của cùng một tháng là SỬA,
    // không phải thêm dòng thứ hai.
    const { data, error } = await supabase
      .from("meter_readings")
      .upsert(meterReadingToRow(input), { onConflict: "room_id,period" })
      .select("*")
      .single();
    if (error) rethrow(error, "Không lưu được chỉ số điện nước");
    return toMeterReading(data as MeterReadingRow);
  },

  async deleteMeterReading(id) {
    const supabase = await createClient();
    const { error } = await supabase.from("meter_readings").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được chỉ số");
  },

  /* -------------------------------------------------------------- hoá đơn */

  async listInvoices(filter: InvoiceFilter = {}) {
    const supabase = await createClient();

    let query = supabase.from("invoices").select(INVOICE_SELECT);
    if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);
    if (filter.period) query = query.eq("period", filter.period);
    if (filter.roomId) query = query.eq("room_id", filter.roomId);

    const { data, error } = await query.order("period", { ascending: false });
    if (error) rethrow(error, "Không đọc được danh sách hoá đơn");

    // Cùng một kỳ thì xếp theo mã phòng, để bảng đọc như sơ đồ nhà trọ.
    return mapInvoiceDetails(data).sort(
      (a, b) => b.period.localeCompare(a.period) || a.room.code.localeCompare(b.room.code),
    );
  },

  async listInvoicesForTenant(tenantId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_SELECT)
      .eq("tenant_id", tenantId)
      .order("period", { ascending: false });
    if (error) rethrow(error, "Không đọc được hoá đơn của bạn");
    return mapInvoiceDetails(data);
  },

  async getInvoice(id) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được hoá đơn");
    if (!data) return null;
    return mapInvoiceDetails([data])[0] ?? null;
  },

  async createInvoice(input: InvoiceInput) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .insert(invoiceToRow(input))
      .select("*")
      .single();
    if (error) rethrow(error, "Không lập được hoá đơn");
    return toInvoice(data as InvoiceRow);
  },

  async updateInvoice(id, input: InvoiceInput) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .update(invoiceToRow(input))
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được hoá đơn");
    return toInvoice(data as InvoiceRow);
  },

  async setInvoiceStatus(id, status, options = {}) {
    const supabase = await createClient();

    // Mốc thời gian đi kèm trạng thái, không tách rời: constraint
    // `invoices_paid_has_timestamp` từ chối "đã thu" mà thiếu `paid_at`.
    const patch: Record<string, unknown> = { status };
    if (status === "issued") {
      patch.issued_at = new Date().toISOString();
      patch.paid_at = null;
      patch.paid_method = null;
    } else if (status === "paid") {
      patch.paid_at = new Date().toISOString();
      patch.paid_method = options.paidMethod ?? null;
    } else {
      patch.paid_at = null;
      patch.paid_method = null;
    }

    const { data, error } = await supabase
      .from("invoices")
      .update(patch)
      .eq("id", id)
      .select(INVOICE_SELECT)
      .single();
    if (error) rethrow(error, "Không đổi được trạng thái hoá đơn");

    const detail = mapInvoiceDetails([data])[0];
    if (!detail) throw new Error("INVOICE_NOT_FOUND");
    return detail;
  },

  async deleteInvoice(id) {
    const supabase = await createClient();
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được hoá đơn");
  },

  async listOverdueInvoices(today) {
    // service-role: job cron chạy khi không có ai đăng nhập, client thường sẽ bị
    // RLS lọc sạch và cron sẽ "thành công" mà không nhắc ai cả.
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_SELECT)
      .eq("status", "issued")
      .not("due_date", "is", null)
      .lt("due_date", today)
      .order("due_date");
    if (error) rethrow(error, "Không đọc được hoá đơn quá hạn");
    return mapInvoiceDetails(data);
  },

  async hasInvoiceDueReminder(invoiceId) {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", invoiceId)
      .eq("type", "invoice_due");
    if (error) rethrow(error, "Không kiểm được thông báo nhắc hạn");
    return (count ?? 0) > 0;
  },

  /* ------------------------------------------------------------ thông báo */

  async listNotifications(userId, limit = 50) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) rethrow(error, "Không đọc được thông báo");
    return (data as NotificationRow[]).map(toNotification);
  },

  async countUnreadNotifications(userId) {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) rethrow(error, "Không đếm được thông báo chưa đọc");
    return count ?? 0;
  },

  async listAdmins() {
    // service-role: hàm này được gọi từ phiên của NGƯỜI THUÊ vừa gửi báo hỏng, và
    // policy `profiles_select` chỉ cho họ đọc dòng của chính mình. Không có
    // đường nào để họ tự tra ra danh sách chủ trọ — đó là điểm của việc dùng
    // service-role ở đây thay vì nới policy.
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "admin")
      .eq("is_active", true)
      .order("full_name");
    if (error) rethrow(error, "Không đọc được danh sách chủ trọ");
    return (data as ProfileRow[]).map(toProfile);
  },

  async createNotification(input: NotificationInput) {
    // service-role, không phải client của người đang đăng nhập: thông báo được
    // tạo cả từ hành động của chủ trọ LẪN từ job cron nhắc hạn, mà lúc cron chạy
    // thì không có ai đăng nhập để RLS dựa vào.
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        invoice_id: input.invoiceId,
      })
      .select("*")
      .single();
    if (error) rethrow(error, "Không tạo được thông báo");
    return toNotification(data as NotificationRow);
  },

  async markNotificationEmailSent(id) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("notifications")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", id);
    if (error) rethrow(error, "Không ghi được mốc gửi email");
  },

  async markNotificationRead(id) {
    const supabase = await createClient();
    // Không cần điều kiện user_id: RLS chỉ cho sửa dòng của chính mình, và GRANT
    // ở tầng cột chỉ cho sửa đúng `read_at`.
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
    if (error) rethrow(error, "Không đánh dấu được đã đọc");
  },

  async markAllNotificationsRead(userId) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) rethrow(error, "Không đánh dấu được đã đọc");
  },

  /* ------------------------------------------------- mã cổng / vân tay */

  async getGateCredential(profileId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gate_credentials")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();
    // Người thuê gọi tới đây thì RLS trả về 0 dòng, không phải lỗi — nhưng cũng
    // không có đường nào để họ gọi: mọi lối vào đều qua `requireAdmin()`.
    if (error) rethrow(error, "Không đọc được mã cổng");
    return data ? toGateCredential(data as GateCredentialRow) : null;
  },

  async saveGateCredential(profileId, input: GateCredentialInput) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("gate_credentials")
      .upsert(
        {
          profile_id: profileId,
          gate_code: input.gateCode,
          fingerprint_slot: input.fingerprintSlot,
          note: input.note,
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id ?? null,
        },
        { onConflict: "profile_id" },
      )
      .select("*")
      .single();
    if (error) rethrow(error, "Không lưu được mã cổng");
    return toGateCredential(data as GateCredentialRow);
  },

  async deleteGateCredential(profileId) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("gate_credentials")
      .delete()
      .eq("profile_id", profileId);
    if (error) rethrow(error, "Không xoá được mã cổng");
  },

  /* ------------------------------------------------------------ dashboard */

  /* ------------------------------------------------------ cách nhận tiền */

  async listPaymentAccounts(options = {}) {
    const supabase = await createClient();

    let query = supabase.from("payment_accounts").select("*");
    if (!options.includeInactive) query = query.eq("is_active", true);

    // `created_at` là tiêu chí phụ: hai dòng cùng sort_order (thêm liên tiếp
    // trước khi ai đó sắp lại) vẫn phải ra thứ tự ổn định giữa các lần tải.
    const { data, error } = await query
      .order("sort_order")
      .order("created_at");
    if (error) rethrow(error, "Không đọc được danh sách nhận tiền");

    return (data as PaymentAccountRow[]).map(toPaymentAccount);
  },

  async getPaymentAccount(id) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payment_accounts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được cách nhận tiền");
    return data ? toPaymentAccount(data as PaymentAccountRow) : null;
  },

  async createBankAccount(input: PaymentAccountInput) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payment_accounts")
      .insert({
        kind: "bank",
        label: input.label,
        bank_name: input.bankName,
        account_number: input.accountNumber,
        account_holder: input.accountHolder,
        qr_path: null,
        note: input.note,
        is_active: input.isActive,
        sort_order: await nextPaymentSortOrder(),
      })
      .select("*")
      .single();
    if (error) rethrow(error, "Không lưu được số tài khoản");

    return toPaymentAccount(data as PaymentAccountRow);
  },

  async createQrAccount(input, file) {
    const supabase = await createClient();

    const extension =
      { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" }[file.type] ??
      "png";
    const storagePath = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PAYMENT_QR_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw new Error(
        /row-level security|Unauthorized/i.test(uploadError.message)
          ? "PAYMENT_QR_UPLOAD_FORBIDDEN"
          : `Không tải được ảnh QR lên: ${uploadError.message}`,
      );
    }

    const { data, error } = await supabase
      .from("payment_accounts")
      .insert({
        kind: "qr",
        label: input.label,
        qr_path: storagePath,
        note: input.note,
        is_active: input.isActive,
        sort_order: await nextPaymentSortOrder(),
      })
      .select("*")
      .single();

    if (error) {
      // Ghi bảng hỏng thì file vừa lên thành rác vĩnh viễn — dọn ngay.
      await supabase.storage.from(PAYMENT_QR_BUCKET).remove([storagePath]);
      rethrow(error, "Không lưu được ảnh QR");
    }

    return toPaymentAccount(data as PaymentAccountRow);
  },

  async updatePaymentAccount(id, input: PaymentAccountInput) {
    const supabase = await createClient();

    const current = await supabaseAdapter.getPaymentAccount(id);
    if (!current) throw new Error("PAYMENT_ACCOUNT_NOT_FOUND");

    // Dòng QR chỉ đổi được nhãn/ghi chú/bật-tắt. Ba cột ngân hàng phải giữ null,
    // nếu không ràng buộc `payment_accounts_shape` sẽ chặn — và đúng ra là thế.
    const patch =
      current.kind === "qr"
        ? { label: input.label, note: input.note, is_active: input.isActive }
        : {
            label: input.label,
            bank_name: input.bankName,
            account_number: input.accountNumber,
            account_holder: input.accountHolder,
            note: input.note,
            is_active: input.isActive,
          };

    const { data, error } = await supabase
      .from("payment_accounts")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) rethrow(error, "Không cập nhật được cách nhận tiền");

    return toPaymentAccount(data as PaymentAccountRow);
  },

  async deletePaymentAccount(id) {
    const supabase = await createClient();

    const current = await supabaseAdapter.getPaymentAccount(id);
    if (!current) return;

    const { error } = await supabase.from("payment_accounts").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được cách nhận tiền");

    // Xoá file SAU khi xoá dòng, cùng lý do như ảnh phòng: làm ngược lại mà xoá
    // dòng hỏng thì giao diện còn thẻ QR nhưng ảnh đã mất.
    if (current.qrPath) {
      await supabase.storage.from(PAYMENT_QR_BUCKET).remove([current.qrPath]);
    }
  },

  async movePaymentAccount(id, direction) {
    const supabase = await createClient();

    const { data: siblings, error: listError } = await supabase
      .from("payment_accounts")
      .select("id")
      .order("sort_order")
      .order("created_at");
    if (listError) rethrow(listError, "Không đọc được danh sách nhận tiền");

    const ids = (siblings as { id: string }[]).map((row) => row.id);
    const from = ids.indexOf(id);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= ids.length) return;

    [ids[from], ids[to]] = [ids[to], ids[from]];

    for (const [index, rowId] of ids.entries()) {
      const { error } = await supabase
        .from("payment_accounts")
        .update({ sort_order: index })
        .eq("id", rowId);
      if (error) rethrow(error, "Không đổi được thứ tự");
    }
  },

  /* ------------------------------------------------------------ báo hỏng */

  async listMaintenanceRequests(filter: MaintenanceFilter = {}) {
    const supabase = await createClient();

    let query = supabase.from("maintenance_requests").select(MAINTENANCE_SELECT);
    if (filter.roomId) query = query.eq("room_id", filter.roomId);
    if (filter.status === "active") {
      query = query.in("status", ["open", "in_progress"]);
    } else if (filter.status && filter.status !== "all") {
      query = query.eq("status", filter.status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) rethrow(error, "Không đọc được danh sách báo hỏng");

    return mapMaintenanceDetails(data);
  },

  async listMaintenanceRequestsForUser() {
    const supabase = await createClient();

    // Không lọc theo userId ở đây: RLS đã quyết định người này thấy phiếu nào
    // (phòng đang ở + phiếu tự gửi). Lọc thêm ở app sẽ chỉ làm hai nơi cùng
    // định nghĩa "của tôi", và sớm muộn hai định nghĩa đó lệch nhau.
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(MAINTENANCE_SELECT)
      .order("created_at", { ascending: false });
    if (error) rethrow(error, "Không đọc được danh sách báo hỏng");

    return mapMaintenanceDetails(data);
  },

  async getMaintenanceRequest(id) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select(MAINTENANCE_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) rethrow(error, "Không đọc được phiếu báo hỏng");
    if (!data) return null;
    return mapMaintenanceDetails([data])[0] ?? null;
  },

  async createMaintenanceRequest(input) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        room_id: input.roomId,
        reported_by: input.reportedBy,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: "open",
      })
      .select("*")
      .single();
    if (error) rethrow(error, "Không gửi được báo hỏng");

    return toMaintenanceRequest(data as MaintenanceRow);
  },

  async updateMaintenanceRequest(id, input: MaintenanceInput) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("maintenance_requests")
      .update({
        room_id: input.roomId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) rethrow(error, "Không cập nhật được phiếu báo hỏng");

    const detail = await supabaseAdapter.getMaintenanceRequest(id);
    if (!detail) throw new Error("MAINTENANCE_NOT_FOUND");
    return detail;
  },

  async setMaintenanceStatus(id, status, options = {}) {
    const supabase = await createClient();

    const current = await supabaseAdapter.getMaintenanceRequest(id);
    if (!current) throw new Error("MAINTENANCE_NOT_FOUND");

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("maintenance_requests")
      .update({
        status,
        updated_at: now,
        // `resolved_at` là cột một chiều: đặt khi chuyển sang 'resolved', và giữ
        // nguyên nếu sau đó phiếu bị mở lại — mốc "lần đầu báo đã sửa xong" là
        // thứ đáng giữ, còn lần mở lại đã có `updated_at` ghi hộ.
        resolved_at: status === "resolved" ? (current.resolvedAt ?? now) : current.resolvedAt,
        resolution_note:
          options.resolutionNote === undefined
            ? current.resolutionNote
            : options.resolutionNote,
      })
      .eq("id", id);
    if (error) rethrow(error, "Không đổi được trạng thái phiếu");

    // Chi phí sửa KHÔNG nằm ở bảng phiếu — người thuê đọc được dòng phiếu của
    // mình. Nó thành một dòng nhật ký phòng, bảng vốn chỉ mở cho admin.
    if (options.cost !== undefined && options.cost !== null && options.cost > 0) {
      await supabase.from("room_events").insert({
        room_id: current.roomId,
        type: "maintenance",
        title: current.title,
        content: options.resolutionNote ?? current.resolutionNote,
        cost: options.cost,
        occurred_at: now,
      });
    }

    const detail = await supabaseAdapter.getMaintenanceRequest(id);
    if (!detail) throw new Error("MAINTENANCE_NOT_FOUND");
    return detail;
  },

  async updateOwnMaintenanceRequest(id, input) {
    const supabase = await createClient();

    // Qua SQL function chứ không UPDATE thẳng: hàm kiểm "phiếu của chính tôi" và
    // "còn ở trạng thái open" trong cùng một giao dịch, và chỉ chạm đúng ba cột.
    // Một policy UPDATE cho người thuê sẽ đồng thời cho họ tự đặt status.
    const { error } = await supabase.rpc("update_my_maintenance_request", {
      request_id: id,
      new_title: input.title,
      new_description: input.description,
      new_priority: input.priority,
    });
    if (error) rethrow(error, "Không sửa được phiếu báo hỏng");
  },

  async closeMaintenanceRequest(id, note) {
    const supabase = await createClient();

    const { error } = await supabase.rpc("close_maintenance_request", {
      request_id: id,
      note,
    });
    if (error) rethrow(error, "Không đóng được phiếu báo hỏng");
  },

  async deleteMaintenanceRequest(id) {
    const supabase = await createClient();
    // Ảnh đi theo: `maintenance_photos.request_id` có ON DELETE CASCADE nên các
    // dòng tự biến mất, nhưng FILE trong bucket thì không — Storage không biết gì
    // về khoá ngoại. Dọn file trước, rồi mới xoá phiếu.
    const paths = await supabaseAdapter.listMaintenancePhotos(id);
    if (paths.length > 0) {
      await supabase.storage
        .from(MAINTENANCE_PHOTO_BUCKET)
        .remove(paths.map((photo) => photo.storagePath));
    }

    const { error } = await supabase.from("maintenance_requests").delete().eq("id", id);
    if (error) rethrow(error, "Không xoá được phiếu báo hỏng");
  },

  /* ------------------------------------------- ảnh đính kèm báo hỏng */

  async listMaintenancePhotos(requestId) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("maintenance_photos")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at");
    if (error) rethrow(error, "Không đọc được ảnh đính kèm");

    const rows = (data ?? []) as MaintenancePhotoRow[];
    if (rows.length === 0) return [];

    // Ký một lượt cho cả danh sách thay vì mỗi ảnh một lần gọi.
    const { data: signed } = await supabase.storage
      .from(MAINTENANCE_PHOTO_BUCKET)
      .createSignedUrls(
        rows.map((row) => row.storage_path),
        MAINTENANCE_PHOTO_URL_TTL_SECONDS,
      );

    const urlByPath = new Map(
      (signed ?? []).map((entry) => [entry.path ?? "", entry.signedUrl ?? null]),
    );

    // Ảnh ký hỏng vẫn trả về dòng với `url = null`: giao diện hiện một ô báo
    // "không mở được ảnh" thay vì im lặng giấu mất một tấm ảnh có thật.
    return rows.map((row) =>
      toMaintenancePhoto(row, urlByPath.get(row.storage_path) ?? null),
    );
  },

  async countMaintenancePhotos(requestId) {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("maintenance_photos")
      .select("id", { count: "exact", head: true })
      .eq("request_id", requestId);
    if (error) rethrow(error, "Không đếm được ảnh đính kèm");
    return count ?? 0;
  },

  async addMaintenancePhoto(requestId, uploaderId, file) {
    const supabase = await createClient();

    const extension =
      { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" }[file.type] ??
      "jpg";
    // Thư mục đầu tiên PHẢI là id phiếu: policy trên storage.objects đọc đúng
    // phần đó để biết ảnh thuộc phiếu nào. Đổi quy ước này là mở toang bucket.
    const storagePath = `${requestId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(MAINTENANCE_PHOTO_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw new Error(
        /row-level security|Unauthorized/i.test(uploadError.message)
          ? "MAINTENANCE_PHOTO_FORBIDDEN"
          : `Không tải được ảnh lên: ${uploadError.message}`,
      );
    }

    const { data, error } = await supabase
      .from("maintenance_photos")
      .insert({
        request_id: requestId,
        storage_path: storagePath,
        uploaded_by: uploaderId,
      })
      .select("*")
      .single();

    if (error) {
      // Ghi bảng hỏng thì file vừa lên thành rác vĩnh viễn — dọn ngay.
      await supabase.storage.from(MAINTENANCE_PHOTO_BUCKET).remove([storagePath]);
      rethrow(error, "Không lưu được ảnh đính kèm");
    }

    const row = data as MaintenancePhotoRow;
    const { data: signed } = await supabase.storage
      .from(MAINTENANCE_PHOTO_BUCKET)
      .createSignedUrl(storagePath, MAINTENANCE_PHOTO_URL_TTL_SECONDS);

    return toMaintenancePhoto(row, signed?.signedUrl ?? null);
  },

  async deleteMaintenancePhoto(photoId) {
    const supabase = await createClient();

    const { data: photo, error: findError } = await supabase
      .from("maintenance_photos")
      .select("storage_path")
      .eq("id", photoId)
      .maybeSingle();
    if (findError) rethrow(findError, "Không tìm được ảnh");
    if (!photo) return;

    // Xoá dòng TRƯỚC: RLS ở đây mới là thứ quyết định người này có được xoá hay
    // không. Xoá file trước rồi mới phát hiện không có quyền là mất ảnh mà dòng
    // vẫn còn, và giao diện hiện một ô ảnh vỡ vĩnh viễn.
    const { data: deleted, error } = await supabase
      .from("maintenance_photos")
      .delete()
      .eq("id", photoId)
      .select("id");
    if (error) rethrow(error, "Không xoá được ảnh");
    if ((deleted ?? []).length === 0) throw new Error("MAINTENANCE_PHOTO_FORBIDDEN");

    await supabase.storage
      .from(MAINTENANCE_PHOTO_BUCKET)
      .remove([photo.storage_path as string]);
  },

  /* -------------------------------------------------- dashboard + báo cáo */

  async getAdminTodo(period): Promise<AdminTodo> {
    const supabase = await createClient();
    // Ngày theo giờ nhà trọ: `due_date` là cột `date` thuần, so với ngày UTC thì
    // mỗi tối 17:00–24:00 giờ Việt Nam sẽ đếm thừa một ngày hoá đơn "quá hạn".
    const today = todayInHouseTz();

    const [overdue, drafts, pendingIds, maintenance, rooms, readings] = await Promise.all([
      supabase
        .from("invoices")
        .select("total")
        .eq("status", "issued")
        .not("due_date", "is", null)
        .lt("due_date", today),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase
        .from("id_documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("maintenance_requests")
        .select("priority")
        .in("status", ["open", "in_progress"]),
      loadRoomsWithOccupancy(),
      supabase.from("meter_readings").select("room_id").eq("period", period),
    ]);

    if (overdue.error) rethrow(overdue.error, "Không đọc được hoá đơn quá hạn");
    if (maintenance.error) rethrow(maintenance.error, "Không đọc được danh sách báo hỏng");
    if (readings.error) rethrow(readings.error, "Không đọc được chỉ số điện nước");

    const overdueRows = (overdue.data ?? []) as { total: number | string }[];
    const openRows = (maintenance.data ?? []) as { priority: MaintenancePriority }[];
    const recorded = new Set(
      ((readings.data ?? []) as { room_id: string }[]).map((row) => row.room_id),
    );

    return {
      overdueInvoices: overdueRows.length,
      overdueAmount: overdueRows.reduce((sum, row) => sum + num(row.total), 0),
      draftInvoices: drafts.count ?? 0,
      pendingIdDocuments: pendingIds.count ?? 0,
      openMaintenance: openRows.length,
      urgentMaintenance: openRows.filter((row) => row.priority === "urgent").length,
      period,
      roomsMissingReading: rooms
        .filter((room) => room.occupants.length > 0 && !recorded.has(room.id))
        .map((room) => room.code),
    };
  },

  async getRevenueReport(from, to): Promise<RevenueReport> {
    const supabase = await createClient();

    // Hoá đơn nháp và hoá đơn huỷ không phải doanh thu: nháp thì người thuê chưa
    // thấy, huỷ thì không còn là tiền phải thu. Lọc ngay ở database.
    const { data, error } = await supabase
      .from("invoices")
      .select("room_id, period, total, status, electric_kwh, water_m3, rooms(code)")
      .gte("period", from)
      .lte("period", to)
      .in("status", ["issued", "paid"]);
    if (error) rethrow(error, "Không đọc được số liệu doanh thu");

    // `as unknown as` vì PostgREST khai kiểu quan hệ lồng là mảng, còn khoá
    // ngoại một-một thì thực tế trả về đúng một object (hoặc null).
    const rows = (data ?? []) as unknown as {
      room_id: string;
      period: string;
      total: number | string;
      status: InvoiceStatus;
      electric_kwh: number | string;
      water_m3: number | string;
      rooms: { code: string } | null;
    }[];

    // Khung tháng dựng trước từ khoảng đã chọn, không dựng từ dữ liệu: tháng
    // không thu được đồng nào phải hiện thành cột 0 chứ không được biến mất khỏi
    // biểu đồ — đó chính là tháng chủ trọ cần nhìn.
    const periods = new Map<string, RevenuePeriod>();
    for (let cursor = from; cursor <= to; cursor = nextPeriodString(cursor)) {
      periods.set(cursor, {
        period: cursor,
        billed: 0,
        collected: 0,
        outstanding: 0,
        invoiceCount: 0,
        paidCount: 0,
        electricKwh: 0,
        waterM3: 0,
      });
    }

    const rooms = new Map<string, RevenueByRoom>();

    for (const row of rows) {
      const total = num(row.total);
      const paid = row.status === "paid";
      const key = row.period.slice(0, 10);

      const bucket = periods.get(key);
      if (bucket) {
        bucket.billed += total;
        bucket.invoiceCount += 1;
        bucket.electricKwh += num(row.electric_kwh);
        bucket.waterM3 += num(row.water_m3);
        if (paid) {
          bucket.collected += total;
          bucket.paidCount += 1;
        }
      }

      const room = rooms.get(row.room_id) ?? {
        roomId: row.room_id,
        roomCode: row.rooms?.code ?? "—",
        billed: 0,
        collected: 0,
        outstanding: 0,
        invoiceCount: 0,
      };
      room.billed += total;
      room.invoiceCount += 1;
      if (paid) room.collected += total;
      rooms.set(row.room_id, room);
    }

    const periodList = [...periods.values()].map((entry) => ({
      ...entry,
      outstanding: entry.billed - entry.collected,
    }));

    const roomList = [...rooms.values()]
      .map((entry) => ({ ...entry, outstanding: entry.billed - entry.collected }))
      .sort((a, b) => a.roomCode.localeCompare(b.roomCode, "vi"));

    const totals = periodList.reduce(
      (sum, entry) => ({
        billed: sum.billed + entry.billed,
        collected: sum.collected + entry.collected,
        outstanding: sum.outstanding + entry.outstanding,
        invoiceCount: sum.invoiceCount + entry.invoiceCount,
        electricKwh: sum.electricKwh + entry.electricKwh,
        waterM3: sum.waterM3 + entry.waterM3,
      }),
      { billed: 0, collected: 0, outstanding: 0, invoiceCount: 0, electricKwh: 0, waterM3: 0 },
    );

    return { from, to, periods: periodList, rooms: roomList, totals };
  },

  async getAdminStats(): Promise<AdminStats> {
    const rooms = await loadRoomsWithOccupancy();

    const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
    const activeTenancies = rooms.flatMap((r) => r.occupants.map((o) => o.tenancy));

    const supabase = await createClient();
    const { data: unpaidRows, error: unpaidError } = await supabase
      .from("invoices")
      .select("total")
      .eq("status", "issued");
    if (unpaidError) rethrow(unpaidError, "Không đọc được hoá đơn chưa thu");

    const unpaid = ((unpaidRows ?? []) as { total: number | string }[]).map((row) =>
      num(row.total),
    );

    return {
      totalRooms: rooms.length,
      occupiedRooms,
      vacantRooms: rooms.filter((r) => r.status === "vacant").length,
      maintenanceRooms: rooms.filter((r) => r.status === "maintenance").length,
      activeTenants: new Set(activeTenancies.map((t) => t.tenantId)).size,
      monthlyRevenue: activeTenancies.reduce((sum, t) => sum + t.monthlyPrice, 0),
      occupancyRate: rooms.length === 0 ? 0 : occupiedRooms / rooms.length,
      unpaidInvoices: unpaid.length,
      unpaidAmount: unpaid.reduce((sum, value) => sum + value, 0),
    };
  },
};

function mapTenancyDetails(rows: unknown): TenancyDetail[] {
  const typed = (rows ?? []) as (TenancyRow & {
    rooms: RoomRow | null;
    profiles: ProfileRow | null;
  })[];

  return typed
    .filter((row) => row.rooms !== null && row.profiles !== null)
    .map<TenancyDetail>((row) => ({
      ...toTenancy(row),
      room: toRoom(row.rooms!),
      tenant: toProfile(row.profiles!),
    }));
}
