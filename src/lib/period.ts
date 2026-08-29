import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";

import { todayInHouseTz } from "@/lib/format";
import type { MeterReading } from "@/types";

/**
 * Kỳ tính tiền = một tháng, viết bằng ngày 01 của tháng đó ("2026-08-01").
 *
 * Cả database (constraint `*_period_is_month`) và app đều dùng đúng một quy ước
 * này, nên không bao giờ có hai dòng cho cùng một tháng chỉ vì một chỗ ghi ngày
 * 01 và chỗ kia ghi ngày 15.
 *
 * `<input type="month">` lại làm việc với dạng "2026-08" — hai hàm đổi qua lại
 * bên dưới là chỗ duy nhất biết về sự khác biệt đó.
 */

/** "2026-08" hoặc "2026-08-17" -> "2026-08-01". Chuỗi rác trả về null. */
export function toPeriod(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  const month = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (month) return `${month[1]}-${month[2]}-01`;

  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return null;
  const parsed = parseISO(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return format(startOfMonth(parsed), "yyyy-MM-dd");
}

/** "2026-08-01" -> "2026-08", dạng `<input type="month">` cần. */
export function toMonthInputValue(period: string): string {
  return period.slice(0, 7);
}

/**
 * Tháng hiện tại, dạng kỳ.
 *
 * Lấy "hôm nay" theo giờ NHÀ TRỌ, không theo giờ máy chủ. Trên máy chủ UTC, từ
 * 00:00 tới 07:00 giờ Việt Nam ngày 01 hàng tháng thì `new Date()` vẫn còn là
 * tháng trước — chủ trọ mở /admin/meters sáng sớm mùng 1 sẽ thấy sai tháng.
 */
export function currentPeriod(): string {
  return `${todayInHouseTz().slice(0, 7)}-01`;
}

export function previousPeriod(period: string): string {
  return format(subMonths(parseISO(period), 1), "yyyy-MM-dd");
}

export function nextPeriod(period: string): string {
  return format(addMonths(parseISO(period), 1), "yyyy-MM-dd");
}

/**
 * Danh sách kỳ để chọn trong dropdown: từ tháng này lùi về `count` tháng.
 *
 * Không cho chọn tháng tương lai — chỉ số điện nước của tháng chưa xảy ra thì
 * không có gì để ghi, và một hoá đơn tháng sau chỉ có thể là lỗi bấm nhầm.
 */
export function recentPeriods(count = 12): string[] {
  // `parseISO` trên một kỳ ("2026-08-01") cho nửa đêm giờ máy — nhưng vì ngày
  // luôn là 01 và ta chỉ cộng/trừ tháng, kết quả không bao giờ tràn sang tháng
  // khác dù máy chủ ở múi giờ nào.
  const now = startOfMonth(parseISO(currentPeriod()));
  return Array.from({ length: count }, (_, index) =>
    format(subMonths(now, index), "yyyy-MM-dd"),
  );
}

/** Ngày đến hạn mặc định: ngày 05 tháng SAU kỳ tính tiền (theo nội quy nhà trọ). */
export function defaultDueDate(period: string): string {
  return format(addMonths(parseISO(period), 1), "yyyy-MM-05");
}

export function electricUsed(reading: Pick<MeterReading, "electricStart" | "electricEnd">) {
  return Math.max(0, reading.electricEnd - reading.electricStart);
}

export function waterUsed(reading: Pick<MeterReading, "waterStart" | "waterEnd">) {
  return Math.max(0, reading.waterEnd - reading.waterStart);
}

/**
 * Tiền của một khoản đo được.
 *
 * Làm tròn về đồng ngay tại đây: cột tiền trong database là `numeric(12,0)`, nên
 * nếu không tròn thì Postgres tự tròn và tổng tiền hiển thị ở app sẽ lệch vài
 * đồng so với hoá đơn đã lưu.
 */
export function lineAmount(quantity: number, unitPrice: number) {
  return Math.round(quantity * unitPrice);
}
