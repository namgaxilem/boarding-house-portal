import { z } from "zod";

import { toPeriod } from "@/lib/period";

/**
 * Hoá đơn nhận SỐ LƯỢNG và ĐƠN GIÁ, không nhận số tiền.
 *
 * Tiền từng khoản và tổng tiền được tính lại ở tầng dưới (`invoiceToRow`, và cột
 * sinh `invoices.total`). Form không có cách nào nói "300 kWh nhưng thu 5 đồng".
 */

const money = (label: string) =>
  z.coerce
    .number({ error: `${label} phải là số` })
    .int(`${label} phải là số nguyên`)
    .min(0, `${label} không được âm`)
    .max(1_000_000_000, `${label} lớn bất thường, kiểm tra lại`);

const quantity = (label: string) =>
  z.coerce
    .number({ error: `${label} phải là số` })
    .min(0, `${label} không được âm`)
    .max(1_000_000, `${label} lớn bất thường, kiểm tra lại`);

const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || !Number.isNaN(Date.parse(value)), {
    message: "Ngày không hợp lệ",
  });

export const invoiceSchema = z
  .object({
    roomId: z.string().min(1, "Chọn phòng"),
    tenantId: z.string().min(1, "Thiếu người thuê đứng tên hoá đơn"),
    tenancyId: optionalId,
    readingId: optionalId,
    period: z
      .string()
      .trim()
      .min(1, "Chọn tháng")
      .transform((value) => toPeriod(value))
      .refine((value): value is string => value !== null, {
        message: "Tháng không hợp lệ",
      }),

    rent: money("Tiền phòng"),
    electricKwh: quantity("Số kWh"),
    electricPrice: money("Giá điện"),
    waterM3: quantity("Số m³ nước"),
    waterPrice: money("Giá nước"),
    serviceAmount: money("Phí dịch vụ"),
    otherAmount: money("Khoản phát sinh"),
    otherNote: z
      .string()
      .trim()
      .max(300, "Lý do phát sinh tối đa 300 ký tự")
      .optional()
      .transform((value) => (value ? value : null)),
    discount: money("Giảm trừ"),
    dueDate: optionalDate,
    note: z
      .string()
      .trim()
      .max(1000, "Ghi chú tối đa 1000 ký tự")
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .superRefine((value, ctx) => {
    // Cùng ràng buộc với constraint `invoices_other_needs_note`. Một khoản tiền
    // không có lý do là thứ người thuê sẽ hỏi, và chủ trọ sẽ không nhớ.
    if (value.otherAmount > 0 && !value.otherNote) {
      ctx.addIssue({
        code: "custom",
        path: ["otherNote"],
        message: "Ghi lý do của khoản phát sinh",
      });
    }
  });

export const paidSchema = z.object({
  invoiceId: z.string().min(1),
  paidMethod: z.enum(["cash", "transfer"], { error: "Chọn hình thức thanh toán" }),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
