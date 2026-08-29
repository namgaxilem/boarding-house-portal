import "server-only";

import { db } from "@/lib/db";
import { absoluteUrl, sendEmail } from "@/lib/email";
import { isEmailConfigured } from "@/lib/env";
import { formatDate, formatMonthYear, formatVND } from "@/lib/format";
import { MAINTENANCE_STATUS_LABEL } from "@/lib/constants";
import { houseConfig } from "@/config/site";
import type {
  AppNotification,
  InvoiceDetail,
  MaintenanceRequestDetail,
  NotificationType,
  Role,
  SessionUser,
} from "@/types";

/**
 * Một chỗ duy nhất để "báo cho người thuê biết".
 *
 * Thứ tự cố định: GHI THÔNG BÁO TRƯỚC, gửi email sau. Nếu làm ngược lại và email
 * gửi xong nhưng insert lỗi, người thuê nhận mail về một hoá đơn mà mở app không
 * thấy đâu cả.
 *
 * Không bao giờ throw. Hoá đơn đã lập rồi; một lỗi ở tầng thông báo không được
 * làm Server Action báo đỏ và khiến chủ trọ bấm lập lại lần hai.
 */

interface NotifyInput {
  recipient: { id: string; email?: string | null };
  type: NotificationType;
  title: string;
  /** Nội dung ngắn, hiện trong app. Cũng là đoạn đầu của email. */
  body: string;
  /** Đường dẫn trong app, ví dụ '/me/invoices/<id>'. */
  link?: string | null;
  invoiceId?: string | null;
  /** Đoạn thêm chỉ có trong email, ví dụ thông tin chuyển khoản. */
  emailLines?: string[];
  actionLabel?: string;
}

export async function notifyUser(input: NotifyInput): Promise<AppNotification | null> {
  let notification: AppNotification;

  try {
    notification = await db.createNotification({
      userId: input.recipient.id,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      invoiceId: input.invoiceId ?? null,
    });
  } catch (error) {
    console.error("[notify] Không tạo được thông báo", error);
    return null;
  }

  const email = input.recipient.email?.trim();
  if (!email || !isEmailConfigured) return notification;

  const sent = await sendEmail({
    to: email,
    subject: `${input.title} — ${houseConfig.name}`,
    heading: input.title,
    lines: [input.body, ...(input.emailLines ?? [])],
    action:
      input.link && input.actionLabel
        ? { label: input.actionLabel, url: absoluteUrl(input.link) }
        : undefined,
  });

  if (sent) {
    try {
      await db.markNotificationEmailSent(notification.id);
      return { ...notification, emailSentAt: new Date().toISOString() };
    } catch (error) {
      // Email đã bay đi rồi; không ghi được cờ chỉ khiến lần nhắc sau gửi trùng
      // một email. Chấp nhận được, và tuyệt đối không được làm hỏng cả hành động.
      console.error("[notify] Không ghi được mốc gửi email", error);
    }
  }

  return notification;
}

/* -------------------------------------------------------------------------- */
/*  Thông báo về hoá đơn — nội dung soạn ở một chỗ để mọi kênh nói giống nhau  */
/* -------------------------------------------------------------------------- */

/** Dòng hướng dẫn chuyển khoản, chỉ thêm vào email nếu nhà trọ có tài khoản. */
function bankLines(invoice: InvoiceDetail): string[] {
  const bank = houseConfig.bank;
  if (!bank) return ["Đóng tiền trực tiếp cho chủ trọ."];

  return [
    `Chuyển khoản: ${bank.name} — ${bank.accountNumber} — ${bank.accountHolder}.`,
    `Nội dung chuyển khoản: ${invoice.room.code} ${formatMonthYear(invoice.period)}.`,
  ];
}

export async function notifyInvoiceIssued(invoice: InvoiceDetail) {
  const period = formatMonthYear(invoice.period);

  return notifyUser({
    recipient: invoice.tenant,
    type: "invoice_issued",
    title: `Hoá đơn tháng ${period} — phòng ${invoice.room.code}`,
    body: `Tổng tiền ${formatVND(invoice.total)}${
      invoice.dueDate ? `, hạn đóng ${formatDate(invoice.dueDate)}` : ""
    }.`,
    link: `/me/invoices/${invoice.id}`,
    invoiceId: invoice.id,
    emailLines: [
      `Tiền phòng ${formatVND(invoice.rent)} · điện ${invoice.electricKwh} kWh ${formatVND(
        invoice.electricAmount,
      )} · nước ${invoice.waterM3} m³ ${formatVND(invoice.waterAmount)} · dịch vụ ${formatVND(
        invoice.serviceAmount,
      )}.`,
      ...bankLines(invoice),
    ],
    actionLabel: "Xem hoá đơn",
  });
}

export async function notifyInvoicePaid(invoice: InvoiceDetail) {
  const period = formatMonthYear(invoice.period);

  return notifyUser({
    recipient: invoice.tenant,
    type: "invoice_paid",
    title: `Đã nhận tiền tháng ${period} — phòng ${invoice.room.code}`,
    body: `Chủ trọ đã ghi nhận thanh toán ${formatVND(invoice.total)}. Cảm ơn bạn.`,
    link: `/me/invoices/${invoice.id}`,
    invoiceId: invoice.id,
    actionLabel: "Xem hoá đơn",
  });
}

export async function notifyInvoiceDue(invoice: InvoiceDetail) {
  const period = formatMonthYear(invoice.period);

  return notifyUser({
    recipient: invoice.tenant,
    type: "invoice_due",
    title: `Nhắc đóng tiền tháng ${period} — phòng ${invoice.room.code}`,
    body: invoice.dueDate
      ? `Hoá đơn ${formatVND(invoice.total)} đã qua hạn ${formatDate(invoice.dueDate)} mà chưa được ghi nhận thanh toán.`
      : `Hoá đơn ${formatVND(invoice.total)} chưa được ghi nhận thanh toán.`,
    link: `/me/invoices/${invoice.id}`,
    invoiceId: invoice.id,
    emailLines: bankLines(invoice),
    actionLabel: "Xem hoá đơn",
  });
}

/* -------------------------------------------------------------------------- */
/*  Thông báo về báo hỏng                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Ai là "phía bên kia" của người vừa thao tác.
 *
 * Báo hỏng luôn có hai phía, và thông báo luôn đi từ phía này sang phía kia:
 *
 *   người thuê làm gì đó  → mọi chủ trọ đang hoạt động
 *   chủ trọ làm gì đó     → người đã gửi phiếu, hoặc — nếu chính chủ trọ ghi hộ
 *                            lúc người thuê gọi điện — người đang ở phòng đó
 *
 * Nhánh cuối là thứ dễ quên nhất: phiếu do chủ trọ tự ghi có `reported_by` trỏ
 * về chính chủ trọ, nên "báo cho người gửi phiếu" sẽ gửi ngược lại cho người vừa
 * bấm nút và người thuê không bao giờ biết cái vòi của mình đã được xử lý.
 */
async function maintenanceCounterparties(
  request: MaintenanceRequestDetail,
  actor: SessionUser,
): Promise<{ id: string; email?: string | null; role: Role }[]> {
  if (actor.role === "tenant") {
    // service-role bên trong: phiên của người thuê không đọc được `profiles` của
    // người khác, kể cả của chủ trọ.
    return db.listAdmins();
  }

  if (request.reportedBy && request.reportedBy !== actor.id) {
    const reporter = await db.getProfile(request.reportedBy);
    if (reporter && reporter.role === "tenant") return [reporter];
  }

  const room = await db.getRoom(request.roomId);
  return (room?.occupants ?? []).map((occupant) => occupant.tenant);
}

/** Chủ trọ đọc phiếu ở khu quản trị, người thuê đọc ở khu của mình. */
function maintenanceLink(request: MaintenanceRequestDetail, role: Role) {
  return role === "admin"
    ? `/admin/maintenance/${request.id}`
    : `/me/maintenance/${request.id}`;
}

/**
 * Phiếu mới.
 *
 * Người thuê gửi → mọi chủ trọ đang hoạt động biết. Gửi cho tất cả chứ không cho
 * một người: nhà trọ có thể có hai tài khoản chủ trọ (vợ chồng, hoặc người quản
 * lý thuê), và một cái vòi rò thì ai rảnh trước xử lý trước.
 *
 * Chủ trọ ghi hộ → người đang ở phòng đó biết. Đó là biên nhận cho cuộc điện
 * thoại họ vừa gọi: có người ghi lại rồi, không phải nhắc lại lần nữa.
 */
export async function notifyMaintenanceCreated(
  request: MaintenanceRequestDetail,
  actor: SessionUser,
) {
  const recipients = await maintenanceCounterparties(request, actor);
  if (recipients.length === 0) return;

  const byTenant = actor.role === "tenant";
  const urgent = request.priority === "urgent";
  const reporter = request.reporter?.fullName ?? "Người thuê";

  await Promise.all(
    recipients.map((recipient) =>
      notifyUser({
        recipient,
        type: "maintenance_new",
        title: byTenant
          ? `${urgent ? "[KHẨN] " : ""}Báo hỏng phòng ${request.room.code}`
          : `Chủ trọ đã ghi nhận: ${request.title}`,
        body: byTenant
          ? `${reporter}: ${request.title}`
          : `Phiếu báo hỏng phòng ${request.room.code} đã được ghi lại. Bạn theo dõi được trạng thái trong app.`,
        link: maintenanceLink(request, recipient.role),
        emailLines: request.description ? [request.description] : undefined,
        actionLabel: "Xem phiếu",
      }),
    ),
  );
}

/**
 * Trạng thái phiếu vừa đổi.
 *
 * Chủ trọ đổi → người thuê biết, kèm ghi chú chủ trọ viết.
 * Người thuê tự đóng → chủ trọ biết. Thiếu chiều này thì chủ trọ vẫn hẹn thợ cho
 * một cái vòi đã hết rò từ hôm kia.
 */
export async function notifyMaintenanceUpdated(
  request: MaintenanceRequestDetail,
  actor: SessionUser,
) {
  const recipients = await maintenanceCounterparties(request, actor);
  if (recipients.length === 0) return;

  const status = MAINTENANCE_STATUS_LABEL[request.status];
  const byTenant = actor.role === "tenant";

  await Promise.all(
    recipients.map((recipient) =>
      notifyUser({
        recipient,
        type: "maintenance_update",
        title: byTenant
          ? `Người thuê ${status.toLowerCase()}: ${request.title}`
          : `${status} — ${request.title}`,
        body: byTenant
          ? `${actor.fullName} đã ${status.toLowerCase()} phiếu báo hỏng phòng ${request.room.code}.`
          : `Phiếu báo hỏng phòng ${request.room.code} chuyển sang “${status}”.`,
        link: maintenanceLink(request, recipient.role),
        emailLines: request.resolutionNote ? [request.resolutionNote] : undefined,
        actionLabel: "Xem phiếu",
      }),
    ),
  );
}
