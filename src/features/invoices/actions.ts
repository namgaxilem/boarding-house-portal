"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  describeError,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { notifyInvoiceIssued, notifyInvoicePaid } from "@/lib/notify";
import { electricUsed, toPeriod, waterUsed, defaultDueDate } from "@/lib/period";
import { formatMonthYear } from "@/lib/format";

import { invoiceSchema, paidSchema } from "./schema";

/**
 * Vòng đời một hoá đơn: nháp -> phát hành -> đã thu, và huỷ ở bất kỳ đâu.
 *
 *   nháp     chỉ chủ trọ thấy (RLS chặn người thuê đọc status='draft'), sửa tự do
 *   phát hành người thuê thấy + nhận thông báo và email
 *   đã thu   chốt lại, không sửa số nữa
 *   huỷ      lập sai thì huỷ rồi lập lại — không xoá, để còn dấu vết
 *
 * Mỗi bước chuyển đều kiểm trạng thái HIỆN TẠI đọc từ database, không tin vào
 * trạng thái mà form gửi lên: hai tab mở song song là chuyện thường.
 */

function readInvoiceForm(formData: FormData) {
  return {
    roomId: formData.get("roomId"),
    tenantId: formData.get("tenantId"),
    tenancyId: formData.get("tenancyId") ?? undefined,
    readingId: formData.get("readingId") ?? undefined,
    period: formData.get("period"),
    rent: formData.get("rent"),
    electricKwh: formData.get("electricKwh"),
    electricPrice: formData.get("electricPrice"),
    waterM3: formData.get("waterM3"),
    waterPrice: formData.get("waterPrice"),
    serviceAmount: formData.get("serviceAmount"),
    otherAmount: formData.get("otherAmount") ?? 0,
    otherNote: formData.get("otherNote") ?? undefined,
    discount: formData.get("discount") ?? 0,
    dueDate: formData.get("dueDate") ?? undefined,
    note: formData.get("note") ?? undefined,
  };
}

function revalidateInvoices(invoiceId?: string) {
  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
  revalidatePath("/me/invoices");
  revalidatePath("/me");
  if (invoiceId) {
    revalidatePath(`/admin/invoices/${invoiceId}`);
    revalidatePath(`/me/invoices/${invoiceId}`);
  }
}

export async function createInvoice(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireAdmin();

  const parsed = invoiceSchema.safeParse(readInvoiceForm(formData));
  if (!parsed.success) return invalid(parsed.error);

  // Hai nút trên form: "Lưu nháp" và "Lưu và phát hành". Phát hành ngay là việc
  // chủ trọ làm 90% số lần, nhưng nháp phải có để soát lại tháng đầu tiên.
  const issueNow = formData.get("intent") === "issue";

  let invoiceId: string;
  try {
    const invoice = await db.createInvoice(parsed.data);
    invoiceId = invoice.id;

    if (issueNow) {
      const detail = await db.setInvoiceStatus(invoice.id, "issued");
      await notifyInvoiceIssued(detail);
    }
  } catch (error) {
    return fail(describeError(error, "Không lập được hoá đơn."));
  }

  revalidateInvoices(invoiceId);
  redirect(`/admin/invoices/${invoiceId}`);
}

export async function updateInvoice(
  invoiceId: string,
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireAdmin();

  const parsed = invoiceSchema.safeParse(readInvoiceForm(formData));
  if (!parsed.success) return invalid(parsed.error);

  const current = await db.getInvoice(invoiceId);
  if (!current) return fail(describeError("INVOICE_NOT_FOUND", "Không tìm thấy hoá đơn."));
  if (current.status === "paid") {
    return fail(describeError("INVOICE_ALREADY_PAID", "Hoá đơn đã thu, không sửa được."));
  }
  if (current.status === "void") {
    return fail(describeError("INVOICE_VOID", "Hoá đơn đã huỷ, không sửa được."));
  }

  try {
    await db.updateInvoice(invoiceId, parsed.data);
  } catch (error) {
    return fail(describeError(error, "Không cập nhật được hoá đơn."));
  }

  revalidateInvoices(invoiceId);
  redirect(`/admin/invoices/${invoiceId}?updated=1`);
}

/** Phát hành: người thuê thấy hoá đơn, kèm thông báo trong app và email. */
export async function issueInvoice(formData: FormData): Promise<void> {
  await requireAdmin();

  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return;

  const current = await db.getInvoice(invoiceId);
  if (!current) redirect("/admin/invoices?error=Kh%C3%B4ng%20t%C3%ACm%20th%E1%BA%A5y%20ho%C3%A1%20%C4%91%C6%A1n");

  if (current.status !== "draft") {
    redirect(
      `/admin/invoices/${invoiceId}?error=${encodeURIComponent(
        describeError("INVOICE_NOT_DRAFT", "Hoá đơn không ở trạng thái nháp."),
      )}`,
    );
  }

  const detail = await db.setInvoiceStatus(invoiceId, "issued");
  await notifyInvoiceIssued(detail);

  revalidateInvoices(invoiceId);
  redirect(`/admin/invoices/${invoiceId}?issued=1`);
}

/** Ghi nhận đã thu tiền. Hình thức thanh toán để sau này đối chiếu sao kê. */
export async function markInvoicePaid(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const parsed = paidSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    paidMethod: formData.get("paidMethod"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const current = await db.getInvoice(parsed.data.invoiceId);
  if (!current) return fail(describeError("INVOICE_NOT_FOUND", "Không tìm thấy hoá đơn."));
  if (current.status === "paid") {
    return fail(describeError("INVOICE_ALREADY_PAID", "Hoá đơn này đã thu."));
  }
  if (current.status !== "issued") {
    return fail("Phát hành hoá đơn trước khi ghi nhận thanh toán.");
  }

  let detail;
  try {
    detail = await db.setInvoiceStatus(parsed.data.invoiceId, "paid", {
      paidMethod: parsed.data.paidMethod,
    });
  } catch (error) {
    return fail(describeError(error, "Không ghi nhận được thanh toán."));
  }

  await notifyInvoicePaid(detail);

  revalidateInvoices(parsed.data.invoiceId);
  return ok("Đã ghi nhận thanh toán và gửi thông báo cho người thuê.");
}

/**
 * Huỷ hoá đơn.
 *
 * Không thông báo cho người thuê: hoá đơn huỷ gần như luôn là chủ trọ nhập sai,
 * và một email "hoá đơn của bạn đã bị huỷ" chỉ làm người ta hoang mang. Bản lập
 * lại sẽ tự gửi thông báo mới.
 */
export async function voidInvoice(formData: FormData): Promise<void> {
  await requireAdmin();

  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return;

  await db.setInvoiceStatus(invoiceId, "void");

  revalidateInvoices(invoiceId);
  redirect(`/admin/invoices/${invoiceId}?voided=1`);
}

/** Xoá hẳn. Chỉ cho hoá đơn nháp hoặc đã huỷ — hoá đơn đã phát hành thì huỷ, không xoá. */
export async function deleteInvoice(formData: FormData): Promise<void> {
  await requireAdmin();

  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return;

  const current = await db.getInvoice(invoiceId);
  if (!current) redirect("/admin/invoices");

  if (current.status === "issued" || current.status === "paid") {
    redirect(
      `/admin/invoices/${invoiceId}?error=${encodeURIComponent(
        "Hoá đơn đã phát hành thì huỷ, không xoá — để còn dấu vết đối chiếu.",
      )}`,
    );
  }

  await db.deleteInvoice(invoiceId);

  revalidateInvoices();
  redirect("/admin/invoices?deleted=1");
}

/**
 * Lập hoá đơn nháp cho TẤT CẢ phòng đang ở trong một tháng.
 *
 * Nháp, không phát hành: máy tính tiền hộ nhưng chủ trọ vẫn phải xem qua trước
 * khi người thuê nhận được thông báo.
 *
 * Bỏ qua (và báo lại) hai loại phòng: chưa ghi chỉ số, và đã có hoá đơn. Không
 * lặng lẽ bỏ qua — chủ trọ cần biết phòng nào còn thiếu để đi đọc đồng hồ.
 */
export async function generateMonthlyInvoices(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const period = toPeriod(String(formData.get("period") ?? ""));
  if (!period) return fail("Tháng không hợp lệ.");

  // Ba truy vấn, không phải 2 + N. Trước đây chỉ số được đọc từng phòng một
  // trong vòng lặp — mười phòng là mười vòng đi về database, và con số đó lớn
  // dần theo số phòng chứ không đứng yên.
  const [rooms, existing, readings] = await Promise.all([
    db.listRooms(),
    db.listInvoices({ period }),
    db.listMeterReadings(period),
  ]);

  const alreadyInvoiced = new Set(
    existing.filter((invoice) => invoice.status !== "void").map((invoice) => invoice.roomId),
  );
  const readingByRoom = new Map(readings.map((reading) => [reading.roomId, reading]));

  const occupied = rooms.filter((room) => room.occupants.length > 0);
  const created: string[] = [];
  const missingReading: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const room of occupied) {
    if (alreadyInvoiced.has(room.id)) {
      skipped.push(room.code);
      continue;
    }

    const reading = readingByRoom.get(room.id);
    if (!reading) {
      missingReading.push(room.code);
      continue;
    }

    const primary =
      room.occupants.find((occupant) => occupant.tenancy.isPrimary) ?? room.occupants[0];

    try {
      await db.createInvoice({
        roomId: room.id,
        tenantId: primary.tenant.id,
        tenancyId: primary.tenancy.id,
        readingId: reading.id,
        period,
        rent: primary.tenancy.monthlyPrice,
        electricKwh: electricUsed(reading),
        electricPrice: room.electricPrice,
        waterM3: waterUsed(reading),
        waterPrice: room.waterPrice,
        serviceAmount: room.servicePrice,
        otherAmount: 0,
        otherNote: null,
        discount: 0,
        dueDate: defaultDueDate(period),
        note: null,
      });
      created.push(room.code);
    } catch (error) {
      // KHÔNG dừng cả mẻ.
      //
      // Trước đây một phòng hỏng là `return fail(...)` ngay — nhưng những hoá đơn
      // lập trước đó đã nằm trong database rồi, mà thông báo lại chỉ nói "không
      // lập được". Chủ trọ bấm lại, thấy các phòng đó báo "đã có hoá đơn", và
      // tưởng app hỏng. Ghi tên phòng lỗi lại rồi đi tiếp, báo hết ở cuối.
      failed.push(`${room.code} (${describeError(error, "lỗi không rõ")})`);
    }
  }

  revalidateInvoices();

  const parts = [`Đã lập ${created.length} hoá đơn nháp cho tháng ${formatMonthYear(period)}.`];
  if (skipped.length > 0) parts.push(`Đã có hoá đơn: ${skipped.join(", ")}.`);
  if (missingReading.length > 0) {
    parts.push(`Chưa ghi chỉ số nên bỏ qua: ${missingReading.join(", ")}.`);
  }

  if (failed.length > 0) {
    // `fail` chứ không `ok`: có phòng chưa ra hoá đơn thì đây là việc chưa xong,
    // và một dải xanh "đã lập xong" là thứ khiến người ta không đọc tiếp.
    return fail([...parts, `Lỗi ở: ${failed.join("; ")}.`].join(" "));
  }

  return ok(parts.join(" "));
}
