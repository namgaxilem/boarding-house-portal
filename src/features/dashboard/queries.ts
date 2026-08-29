import "server-only";

import { cache } from "react";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { dayOfMonthInHouseTz } from "@/lib/format";
import { currentPeriod, previousPeriod } from "@/lib/period";
import type { RevenueReport } from "@/types";

/**
 * `await connection()` trước mọi thứ đụng vào `new Date()`.
 *
 * Cache Components (bật ở next.config.ts) cố prerender những gì có thể, và
 * "tháng hiện tại" thì không prerender được — giá trị đó đổi giữa các lần render.
 * Thiếu dòng này thì `next build` dừng ngay ở /admin với lỗi
 * `blocking-prerender-current-time`.
 *
 * Các trang khác dùng `currentPeriod()` (ví dụ /admin/meters) không cần vì chúng
 * đã `await props.searchParams` trước đó, và đọc searchParams cũng là một API
 * thời điểm-yêu-cầu. Ở đây không có searchParams nào để đọc.
 */

/**
 * `connection()` nằm NGOÀI `cache()`, phần đọc database nằm trong.
 *
 * Gói cả hai vào `cache()` thì lần render thứ hai nhận lại promise đã ghi nhớ và
 * `connection()` không chạy lần nào nữa — Next vẫn thấy `new Date()` trong lượt
 * prerender và dừng build. Tách ra: `connection()` chạy mỗi lượt, truy vấn vẫn
 * chỉ chạy một lần cho mỗi kỳ.
 */
const loadTodo = cache(async (period: string) => db.getAdminTodo(period));

/**
 * Từ ngày này trong tháng, chỉ số điện nước của THÁNG NÀY mới coi là đến hạn.
 *
 * Chỉ số đọc vào cuối tháng. Hỏi "phòng nào chưa ghi chỉ số tháng này" vào ngày
 * 03 là báo động giả suốt ba tuần đầu — và một cảnh báo sai suốt ba tuần thì đến
 * tuần thứ tư cũng bị mắt bỏ qua. Trước mốc này, kỳ đáng hỏi là THÁNG TRƯỚC:
 * chưa ghi tháng trước nghĩa là tháng đó chưa lập được hoá đơn, và đó là nợ thật.
 */
const METER_DUE_DAY = 25;

function meterDuePeriod(): string {
  const current = currentPeriod();
  return dayOfMonthInHouseTz() >= METER_DUE_DAY ? current : previousPeriod(current);
}

/**
 * Việc tồn đọng của chủ trọ.
 *
 * Layout dùng nó để vẽ huy hiệu trên sidebar và trang tổng quan dùng lại nó cho
 * thẻ "Cần xử lý" — một truy vấn cho cả hai.
 */
export async function getAdminTodo() {
  await connection();
  return loadTodo(meterDuePeriod());
}

export const getAdminStats = cache(async () => db.getAdminStats());

/** Số tháng mặc định trên trang báo cáo. Một năm là mốc người ta nghĩ theo. */
export const REPORT_MONTHS = 12;

const loadRevenue = cache(async (from: string, to: string) =>
  db.getRevenueReport(from, to),
);

/**
 * Doanh thu `months` tháng gần nhất, tính lùi từ tháng hiện tại.
 *
 * Tháng đang chạy dở vẫn nằm trong khoảng, nhưng nó luôn thấp một cách vô nghĩa
 * (hoá đơn chưa lập xong), nên đừng đọc nó như một tháng sụt giảm.
 */
export async function getRevenueReport(
  months = REPORT_MONTHS,
): Promise<RevenueReport> {
  await connection();

  const to = currentPeriod();
  let from = to;
  for (let index = 1; index < months; index += 1) from = previousPeriod(from);
  return loadRevenue(from, to);
}
