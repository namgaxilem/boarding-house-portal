import "server-only";

import { formatDate, formatVND } from "@/lib/format";

/**
 * Biến dữ liệu thành chữ cho mô hình đọc — và dựng ranh giới quanh phần chữ do
 * NGƯỜI THUÊ nhập.
 *
 * README mục 3.8 của repo đã viết thẳng mối lo này cho Supabase MCP: *"MCP đọc
 * được nội dung do NGƯỜI THUÊ nhập — tên, mô tả phiếu báo hỏng, ghi chú. Một
 * người thuê có thể cố ý viết vào đó những dòng trông như câu lệnh, và mô hình
 * đọc log/bảng có thể hiểu đó là chỉ thị."*
 *
 * Ở đây có hai câu trả lời, và cái thứ hai mới là cái chặn thật:
 *
 *   1. Mọi trường tự do bị bọc trong `<du_lieu_nguoi_thue>`, và `<` `>` bên
 *      trong bị escape nên KHÔNG đóng sớm được thẻ bọc. Cùng nguyên tắc app đã
 *      áp cho SQL: dữ liệu không bao giờ trở thành cú pháp.
 *   2. Không lệnh ghi nào chạy mà thiếu một cái bấm của chủ trọ (đợt 2). Một
 *      injection hoàn hảo nhiều nhất chỉ tạo ra một thẻ xác nhận để bị huỷ.
 *
 * Tầng thứ ba là CHE BỚT, và nó nằm ngay trong file này: `idNumber` chỉ còn 4
 * số cuối, ghi chú riêng của chủ trọ về người thuê không đi ra khỏi đây. Việc
 * tạo hình cho một consumer mới thuộc về consumer — quy tắc "chỉ dịch trong
 * lib/db" là về snake_case→camelCase, không phải về che dữ liệu.
 */

/** Bọc chữ do người dùng nhập. Escape `<`/`>` để không ai đóng sớm thẻ bọc. */
export function untrusted(field: string, value: string | null | undefined): string {
  if (!value) return "";
  const safe = value.replace(/</g, "‹").replace(/>/g, "›");
  return `<du_lieu_nguoi_thue field="${field}">${safe}</du_lieu_nguoi_thue>`;
}

/** Số CCCD chỉ còn 4 số cuối. Mô hình không có việc gì với đủ 12 số. */
export function maskIdNumber(value: string | null | undefined): string {
  if (!value) return "—";
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}

/** Số điện thoại che 3 số giữa — đủ để chủ trọ nhận ra, không đủ để gọi. */
export function maskPhone(value: string | null | undefined): string {
  if (!value) return "—";
  return value.length <= 6 ? value : `${value.slice(0, 4)}***${value.slice(-3)}`;
}

export function money(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : formatVND(value);
}

export function date(value: string | null | undefined): string {
  return value ? formatDate(value) : "—";
}

/** Danh sách gạch đầu dòng, hoặc một câu "không có" — không bao giờ trả chuỗi rỗng. */
export function bullets(lines: string[], emptyMessage: string): string {
  if (lines.length === 0) return emptyMessage;
  return lines.map((line) => `• ${line}`).join("\n");
}

/**
 * Cắt danh sách dài trước khi đưa cho mô hình.
 *
 * Không phải để tiết kiệm token (mười phòng thì có gì để tiết kiệm) mà để một
 * câu hỏi lỡ tay quét cả bảng không biến thành một lượt 50k token.
 */
export function capped<T>(items: T[], max: number): { items: T[]; note: string } {
  if (items.length <= max) return { items, note: "" };
  return {
    items: items.slice(0, max),
    note: `\n(còn ${items.length - max} dòng nữa, hỏi cụ thể hơn để xem)`,
  };
}
