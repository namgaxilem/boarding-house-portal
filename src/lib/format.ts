import { differenceInCalendarDays, differenceInMonths, parseISO } from "date-fns";

import { houseConfig } from "@/config/site";

/**
 * ============================================================================
 *  Định dạng hiển thị — tiền, ngày giờ, số điện thoại
 * ============================================================================
 *
 * MỌI mốc thời gian được hiển thị theo múi giờ NHÀ TRỌ (`houseConfig.timeZone`),
 * không theo múi giờ máy chủ.
 *
 * Trước đây các hàm này dùng `format()` của date-fns, tức là đọc theo múi giờ
 * của tiến trình Node. Vercel/Cloudflare/container chạy UTC, nên hoá đơn phát
 * hành 09:00 giờ Việt Nam hiện ra thành 02:00 — lệch đúng 7 tiếng, và không ai
 * phát hiện lúc dev vì máy ở Việt Nam vốn đã UTC+7.
 *
 * `Intl.DateTimeFormat` với `timeZone` làm việc đó chính xác, có sẵn trong Node
 * và mọi trình duyệt, và không cần thêm thư viện nào.
 */

const TIME_ZONE = houseConfig.timeZone;

/**
 * Một formatter duy nhất, đọc ra từng phần rồi tự ghép.
 *
 * `formatToParts` chứ không phải chuỗi locale dựng sẵn: locale nào cũng có thể
 * đổi thứ tự hoặc dấu phân cách giữa các phiên bản ICU, mà ba hàm bên dưới phải
 * ra đúng "dd/MM/yyyy" và "HH:mm dd/MM/yyyy" mãi mãi.
 */
const zoned = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

interface Parts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

function partsOf(date: Date): Parts {
  const out = {} as Record<string, string>;
  for (const part of zoned.formatToParts(date)) out[part.type] = part.value;
  return out as unknown as Parts;
}

/** "2026-08-27" — có ngày, không có giờ. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Đọc một giá trị thành các phần ngày giờ theo múi giờ nhà trọ.
 *
 * Cột `date` của Postgres (hạn đóng, ngày nhận phòng, kỳ tính tiền) về đây là
 * chuỗi "yyyy-MM-dd" thuần — KHÔNG mang giờ, KHÔNG mang múi giờ. Những chuỗi đó
 * được cắt bằng chuỗi chứ không qua `Date`: "2026-09-05" nghĩa là ngày 05/09,
 * và đổi múi giờ cho nó là cách chắc chắn nhất để biến nó thành ngày 04/09.
 *
 * Chỉ `timestamptz` (có giờ) mới đi qua Intl.
 */
function readParts(value: string | Date): Parts | null {
  if (typeof value === "string") {
    const dateOnly = DATE_ONLY.exec(value.trim());
    if (dateOnly) {
      return {
        year: dateOnly[1],
        month: dateOnly[2],
        day: dateOnly[3],
        hour: "00",
        minute: "00",
      };
    }
  }

  const date = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return partsOf(date);
}

/**
 * Hôm nay theo giờ nhà trọ, dạng "yyyy-MM-dd".
 *
 * Dùng thay cho `new Date()` ở mọi chỗ cần biết "hôm nay là ngày mấy": trên máy
 * chủ UTC, từ 00:00 tới 07:00 giờ Việt Nam thì `new Date()` vẫn còn là hôm qua.
 */
export function todayInHouseTz(): string {
  const { year, month, day } = partsOf(new Date());
  return `${year}-${month}-${day}`;
}

/** Ngày trong tháng theo giờ nhà trọ (1–31). */
export function dayOfMonthInHouseTz(): number {
  return Number(todayInHouseTz().slice(8, 10));
}

/* -------------------------------------------------------------------------- */
/*  Tiền                                                                      */
/* -------------------------------------------------------------------------- */

const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function formatVND(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return vnd.format(value);
}

/** "2.500.000" — for table cells where the ₫ column header already says the unit. */
export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return plain.format(value);
}

/** "2,5 tr" — compact form for stat tiles where space is tight. */
export function formatCompactVND(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(".", ",")} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return plain.format(value);
}

/* -------------------------------------------------------------------------- */
/*  Ngày giờ                                                                  */
/* -------------------------------------------------------------------------- */

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const parts = readParts(value);
  if (!parts) return "—";
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const parts = readParts(value);
  if (!parts) return "—";
  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`;
}

export function formatMonthYear(value: string | Date) {
  const parts = readParts(value);
  if (!parts) return "—";
  return `${parts.month}/${parts.year}`;
}

/** Input[type=date] wants yyyy-MM-dd regardless of locale. */
export function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const parts = readParts(value);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** "1 năm 2 tháng" — how long someone has been in a room. */
export function formatDuration(start: string | Date, end?: string | Date | null) {
  // Cả hai đầu quy về "yyyy-MM-dd" theo giờ nhà trọ trước khi trừ: so một chuỗi
  // ngày với một `Date` sống là cách đếm ra 0 ngày cho người vừa nhận phòng
  // sáng nay trên máy chủ UTC.
  const startDay = toDateInputValue(start);
  const endDay = end ? toDateInputValue(end) : todayInHouseTz();
  if (!startDay || !endDay) return "—";

  const from = parseISO(startDay);
  const to = parseISO(endDay);

  const days = differenceInCalendarDays(to, from);
  if (days < 0) return "—";

  // Đếm THÁNG TRƯỚC, ngày chỉ là đường lui khi chưa tròn một tháng nào.
  //
  // Cách cũ làm ngược lại — "dưới 31 ngày thì đếm ngày, còn lại chia cho 30,44"
  // — và sai ở cả hai đầu: người vào ngày 01/02 đến ngày 01/03 hiện ra "28 ngày"
  // thay vì "1 tháng", còn người thuê đúng một năm hiện ra "11 tháng" vì
  // 365 / 30,44 = 11,99 rồi bị Math.floor cắt đuôi.
  const months = differenceInMonths(to, from);
  if (months === 0) return `${days} ngày`;
  if (months < 12) return `${months} tháng`;

  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  return restMonths === 0 ? `${years} năm` : `${years} năm ${restMonths} tháng`;
}

/* -------------------------------------------------------------------------- */
/*  Khác                                                                      */
/* -------------------------------------------------------------------------- */

/** 0912345678 -> 0912 345 678 */
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

/** "Nguyễn Văn An" -> "NA" */
export function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
