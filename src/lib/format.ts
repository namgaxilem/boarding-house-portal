import { differenceInCalendarDays, format, parseISO } from "date-fns";

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

function toDate(value: string | Date) {
  return typeof value === "string" ? parseISO(value) : value;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(toDate(value), "dd/MM/yyyy");
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(toDate(value), "HH:mm dd/MM/yyyy");
}

export function formatMonthYear(value: string | Date) {
  return format(toDate(value), "MM/yyyy");
}

/** Input[type=date] wants yyyy-MM-dd regardless of locale. */
export function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  return format(toDate(value), "yyyy-MM-dd");
}

/** "1 năm 2 tháng" — how long someone has been in a room. */
export function formatDuration(start: string | Date, end?: string | Date | null) {
  const days = differenceInCalendarDays(toDate(end ?? new Date()), toDate(start));
  if (days < 0) return "—";
  if (days < 31) return `${days} ngày`;

  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} tháng`;

  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  return restMonths === 0 ? `${years} năm` : `${years} năm ${restMonths} tháng`;
}

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
