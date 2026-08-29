import { z } from "zod";

/**
 * Hai loại "cách nhận tiền", hai schema.
 *
 * Không gộp thành một schema với mọi trường optional: gộp lại thì một dòng ngân
 * hàng thiếu số tài khoản vẫn qua được kiểm tra ở app, rồi vỡ ở ràng buộc
 * `payment_accounts_shape` trong database với một thông báo không ai đọc nổi.
 */

/** Bật/tắt: checkbox HTML gửi "on" khi tick, và không gửi gì khi bỏ tick. */
const activeFlag = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
  .transform((value) => value === "on" || value === "true");

const label = z
  .string()
  .trim()
  .min(1, "Đặt tên cho cách nhận tiền này")
  .max(60, "Tên tối đa 60 ký tự");

const note = z
  .string()
  .trim()
  .max(300, "Ghi chú tối đa 300 ký tự")
  .optional()
  .transform((value) => (value ? value : null));

export const bankAccountSchema = z.object({
  label,
  bankName: z
    .string()
    .trim()
    .min(1, "Nhập tên ngân hàng")
    .max(60, "Tên ngân hàng tối đa 60 ký tự"),
  accountNumber: z
    .string()
    .trim()
    // Khoảng trắng bị bỏ ngay ở đây, trước khi kiểm: chủ trọ hay chép số tài
    // khoản từ app ngân hàng và dính theo dấu cách nhóm số.
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(
      z
        .string()
        .min(4, "Số tài khoản quá ngắn")
        .max(30, "Số tài khoản tối đa 30 ký tự")
        .regex(/^[0-9A-Za-z.-]+$/, "Số tài khoản chỉ gồm chữ, số, dấu chấm và gạch ngang"),
    ),
  accountHolder: z
    .string()
    .trim()
    .min(1, "Nhập tên chủ tài khoản")
    .max(80, "Tên chủ tài khoản tối đa 80 ký tự")
    // Ngân hàng Việt Nam hiển thị tên chủ tài khoản bằng chữ HOA không dấu; giữ
    // nguyên chữ người dùng gõ nhưng bỏ khoảng trắng thừa giữa các từ.
    .transform((value) => value.replace(/\s+/g, " ")),
  note,
  isActive: activeFlag,
});

export const qrAccountSchema = z.object({
  label,
  note,
  isActive: activeFlag,
});
