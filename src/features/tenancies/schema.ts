import { z } from "zod";

export const checkInSchema = z.object({
  roomId: z.string().min(1, "Chọn phòng"),
  tenantId: z.string().min(1, "Chọn người thuê"),
  isPrimary: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .transform((value) => value === "on" || value === "true"),
  startDate: z
    .string()
    .min(1, "Chọn ngày nhận phòng")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Ngày không hợp lệ"),
  deposit: z.coerce
    .number({ error: "Tiền cọc phải là số" })
    .int("Tiền cọc phải là số nguyên")
    .min(0, "Tiền cọc không được âm"),
  monthlyPrice: z.coerce
    .number({ error: "Giá thuê phải là số" })
    .int("Giá thuê phải là số nguyên")
    .min(0, "Giá thuê không được âm"),
});

export const checkOutSchema = z
  .object({
    tenancyId: z.string().min(1),
    endDate: z
      .string()
      .min(1, "Chọn ngày trả phòng")
      .refine((value) => !Number.isNaN(Date.parse(value)), "Ngày không hợp lệ"),
    endReason: z
      .string()
      .trim()
      .min(1, "Chọn hoặc nhập lý do")
      .max(300, "Lý do tối đa 300 ký tự"),
    terminated: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
      .transform((value) => value === "on" || value === "true"),

    /* --------------------------------------------------- kết toán tiền cọc */

    depositDeduction: z.coerce
      .number({ error: "Số trừ vào cọc phải là số" })
      .int("Số trừ vào cọc phải là số nguyên")
      .min(0, "Số trừ vào cọc không được âm"),
    depositRefunded: z.coerce
      .number({ error: "Số hoàn lại phải là số" })
      .int("Số hoàn lại phải là số nguyên")
      .min(0, "Số hoàn lại không được âm"),
    settlementNote: z
      .string()
      .trim()
      .max(500, "Ghi chú tối đa 500 ký tự")
      .optional()
      .transform((value) => (value ? value : null)),
  })
  // Cùng ràng buộc `tenancies_deduction_needs_note` trong database. Kiểm ở đây
  // để lỗi hiện ngay dưới ô ghi chú, chứ không thành một câu Postgres ở đầu form.
  .refine((data) => data.depositDeduction === 0 || data.settlementNote !== null, {
    message: "Có trừ vào cọc thì phải ghi lý do",
    path: ["settlementNote"],
  });
