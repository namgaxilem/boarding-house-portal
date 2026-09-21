import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";
import { formatMonthYear, todayInHouseTz } from "@/lib/format";
import { defineTool, text } from "../tool";
import { bullets, money } from "../serialize";

/** Kỳ hiện tại dạng `YYYY-MM-01`, tính theo múi giờ nhà trọ chứ không theo máy chủ. */
function currentPeriod(): string {
  return `${todayInHouseTz().slice(0, 7)}-01`;
}

export const tongQuanNhaTro = defineTool({
  name: "tong_quan_nha_tro",
  title: "Tổng quan nhà trọ",
  description:
    "Số liệu tổng và danh sách việc còn tồn: phòng trống, hoá đơn quá hạn, báo hỏng đang mở, " +
    "giấy tờ chờ duyệt, bài viết chờ duyệt, phòng chưa ghi chỉ số.",
  inputSchema: z.object({}),
  readOnly: true,
  async run() {
    const [stats, todo] = await Promise.all([
      db.getAdminStats(),
      db.getAdminTodo(currentPeriod()),
    ]);

    const pending: string[] = [];
    if (todo.overdueInvoices > 0) {
      pending.push(`${todo.overdueInvoices} hoá đơn quá hạn — ${money(todo.overdueAmount)}`);
    }
    if (todo.draftInvoices > 0) pending.push(`${todo.draftInvoices} hoá đơn còn ở dạng nháp`);
    if (todo.urgentMaintenance > 0) {
      pending.push(`${todo.urgentMaintenance} báo hỏng KHẨN CẤP`);
    }
    const normalMaintenance = todo.openMaintenance - todo.urgentMaintenance;
    if (normalMaintenance > 0) pending.push(`${normalMaintenance} báo hỏng chờ xử lý`);
    if (todo.pendingIdDocuments > 0) {
      pending.push(`${todo.pendingIdDocuments} hồ sơ giấy tờ chờ duyệt`);
    }
    if (todo.pendingPosts > 0) pending.push(`${todo.pendingPosts} bài viết chờ duyệt`);
    if (todo.roomsMissingReading.length > 0) {
      pending.push(
        `${todo.roomsMissingReading.length} phòng chưa ghi chỉ số ${formatMonthYear(todo.period)}: ` +
          todo.roomsMissingReading.join(", "),
      );
    }
    if (todo.gateCredentialsToRevoke.length > 0) {
      pending.push(
        `${todo.gateCredentialsToRevoke.length} người đã trả phòng mà mã cổng còn ghi trong sổ`,
      );
    }

    return text(
      [
        `${stats.occupiedRooms}/${stats.totalRooms} phòng đang có người (${Math.round(stats.occupancyRate * 100)}%)`,
        `${stats.vacantRooms} phòng trống · ${stats.maintenanceRooms} phòng đang sửa · ${stats.activeTenants} người thuê`,
        `Doanh thu tháng này: ${money(stats.monthlyRevenue)}`,
        `Chưa thu: ${money(stats.unpaidAmount)} từ ${stats.unpaidInvoices} hoá đơn`,
        "",
        "Việc còn tồn:",
        bullets(pending, "Không còn việc tồn."),
      ].join("\n"),
    );
  },
});

export const baoCaoDoanhThu = defineTool({
  name: "bao_cao_doanh_thu",
  title: "Báo cáo doanh thu",
  description:
    "Doanh thu theo tháng trong một khoảng kỳ: đã lập bao nhiêu, thu được bao nhiêu, còn nợ bao nhiêu.",
  inputSchema: z.object({
    tuKy: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .describe("Kỳ bắt đầu, dạng YYYY-MM."),
    denKy: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .describe("Kỳ kết thúc, dạng YYYY-MM. Cả hai đầu đều được tính."),
  }),
  readOnly: true,
  async run(input) {
    const report = await db.getRevenueReport(`${input.tuKy}-01`, `${input.denKy}-01`);

    const lines = report.periods.map(
      (row) =>
        `${formatMonthYear(row.period)} — lập ${money(row.billed)} · thu ${money(row.collected)} · ` +
        `còn ${money(row.outstanding)} (${row.paidCount}/${row.invoiceCount} hoá đơn đã thu)`,
    );

    return text(
      [
        bullets(lines, "Khoảng kỳ này chưa có hoá đơn nào."),
        "",
        `Tổng: lập ${money(report.totals.billed)} · thu ${money(report.totals.collected)} · ` +
          `còn ${money(report.totals.outstanding)}`,
        `Điện ${report.totals.electricKwh} kWh · nước ${report.totals.waterM3} m³`,
      ].join("\n"),
    );
  },
});
