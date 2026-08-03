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

export const checkOutSchema = z.object({
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
});
