import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";
import { INVOICE_STATUS_LABEL } from "@/lib/constants";
import { formatMonthYear, todayInHouseTz } from "@/lib/format";
import { defineTool, text } from "../tool";
import { bullets, capped, date, money, untrusted } from "../serialize";

const period = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Kỳ phải có dạng YYYY-MM")
  .describe("Kỳ tính tiền dạng YYYY-MM, ví dụ '2026-09'.")
  .transform((value) => `${value}-01`);

export const danhSachHoaDon = defineTool({
  name: "danh_sach_hoa_don",
  title: "Danh sách hoá đơn",
  description:
    "Hoá đơn theo kỳ và/hoặc theo trạng thái. Trạng thái: draft (nháp), issued (chờ thu), " +
    "paid (đã thu), void (đã huỷ).",
  inputSchema: z.object({
    ky: period.optional(),
    trangThai: z.enum(["draft", "issued", "paid", "void"]).optional(),
  }),
  readOnly: true,
  async run(input) {
    const invoices = await db.listInvoices({
      ...(input.ky ? { period: input.ky } : {}),
      ...(input.trangThai ? { status: input.trangThai } : {}),
    });
    const { items, note } = capped(invoices, 30);

    const lines = items.map(
      (invoice) =>
        `Phòng ${invoice.room.code} — ${formatMonthYear(invoice.period)} — ${money(invoice.total)} — ` +
        `${INVOICE_STATUS_LABEL[invoice.status]}${invoice.dueDate ? ` (hạn ${date(invoice.dueDate)})` : ""}`,
    );

    return text(bullets(lines, "Không có hoá đơn nào khớp.") + note);
  },
});

export const hoaDonQuaHan = defineTool({
  name: "hoa_don_qua_han",
  title: "Hoá đơn quá hạn",
  description:
    "Hoá đơn đã phát hành, quá ngày hạn mà chưa thu. Đây là câu trả lời cho " +
    "'ai còn nợ tiền'.",
  inputSchema: z.object({}),
  readOnly: true,
  async run() {
    const invoices = await db.listOverdueInvoices(todayInHouseTz());
    if (invoices.length === 0) return text("Không có hoá đơn nào quá hạn.");

    const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const lines = invoices.map(
      (invoice) =>
        `Phòng ${invoice.room.code} — ${invoice.tenant.fullName} — ${money(invoice.total)} — ` +
        `hạn ${date(invoice.dueDate)}`,
    );

    return text(
      `${invoices.length} hoá đơn quá hạn, tổng ${money(total)}:\n${bullets(lines, "")}`,
    );
  },
});

export const chiTietHoaDon = defineTool({
  name: "chi_tiet_hoa_don",
  title: "Chi tiết một hoá đơn",
  description: "Bóc tách một hoá đơn: tiền phòng, điện, nước, dịch vụ, phát sinh, giảm trừ.",
  inputSchema: z.object({
    maHoaDon: z.string().uuid().describe("id hoá đơn, lấy từ danh_sach_hoa_don."),
  }),
  readOnly: true,
  async run(input) {
    const invoice = await db.getInvoice(input.maHoaDon);
    if (!invoice) return text("Không tìm thấy hoá đơn này.");

    return text(
      [
        `Hoá đơn phòng ${invoice.room.code} — ${formatMonthYear(invoice.period)} — ${INVOICE_STATUS_LABEL[invoice.status]}`,
        `Người thuê: ${invoice.tenant.fullName}`,
        "",
        `Tiền phòng      ${money(invoice.rent)}`,
        `Điện            ${invoice.electricKwh} kWh × ${money(invoice.electricPrice)} = ${money(invoice.electricAmount)}`,
        `Nước            ${invoice.waterM3} m³ × ${money(invoice.waterPrice)} = ${money(invoice.waterAmount)}`,
        `Dịch vụ         ${money(invoice.serviceAmount)}`,
        invoice.otherAmount
          ? `Phát sinh       ${money(invoice.otherAmount)} — ${untrusted("ghi_chu_phat_sinh", invoice.otherNote)}`
          : "",
        invoice.discount ? `Giảm trừ        -${money(invoice.discount)}` : "",
        `TỔNG            ${money(invoice.total)}`,
        "",
        invoice.dueDate ? `Hạn đóng: ${date(invoice.dueDate)}` : "",
        invoice.paidAt ? `Đã thu ${date(invoice.paidAt)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  },
});

export const chiSoDienNuoc = defineTool({
  name: "chi_so_dien_nuoc",
  title: "Chỉ số điện nước một kỳ",
  description: "Chỉ số công-tơ đã ghi của một kỳ, kèm lượng tiêu thụ từng phòng.",
  inputSchema: z.object({ ky: period }),
  readOnly: true,
  async run(input) {
    const readings = await db.listMeterReadings(input.ky);
    const lines = readings.map(
      (reading) =>
        `Phòng ${reading.room.code} — điện ${reading.electricEnd - reading.electricStart} kWh ` +
        `(${reading.electricStart}→${reading.electricEnd}) · nước ${reading.waterEnd - reading.waterStart} m³ ` +
        `(${reading.waterStart}→${reading.waterEnd})`,
    );
    return text(
      bullets(lines, `Kỳ ${formatMonthYear(input.ky)} chưa ghi chỉ số phòng nào.`),
    );
  },
});

export const lichSuChiSoPhong = defineTool({
  name: "lich_su_chi_so_phong",
  title: "Lịch sử chỉ số của một phòng",
  description: "Vài kỳ gần nhất của một phòng — để so xem tháng này dùng nhiều bất thường không.",
  inputSchema: z.object({
    maPhong: z.string(),
    soKy: z.number().int().min(1).max(24).default(6),
  }),
  readOnly: true,
  async run(input) {
    const room = await db.getRoomByCode(input.maPhong.trim());
    if (!room) return text(`Không tìm thấy phòng "${input.maPhong}".`);

    const readings = await db.listMeterReadingsForRoom(room.id, input.soKy);
    const lines = readings.map(
      (reading) =>
        `${formatMonthYear(reading.period)} — điện ${reading.electricEnd - reading.electricStart} kWh · ` +
        `nước ${reading.waterEnd - reading.waterStart} m³`,
    );
    return text(bullets(lines, `Phòng ${room.code} chưa có chỉ số nào.`));
  },
});
