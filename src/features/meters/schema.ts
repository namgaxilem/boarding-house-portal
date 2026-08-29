import { z } from "zod";

import { toPeriod } from "@/lib/period";

/**
 * Chỉ số đồng hồ, không phải lượng tiêu thụ.
 *
 * Cho phép số thập phân: đồng hồ nước hay có kim lẻ, và bắt tròn số sẽ khiến chủ
 * trọ tự làm tròn theo hướng có lợi cho mình mà không ai kiểm tra được.
 */
const meterValue = (label: string) =>
  z.coerce
    .number({ error: `${label} phải là số` })
    .min(0, `${label} không được âm`)
    .max(9_999_999, `${label} lớn bất thường, kiểm tra lại`);

const periodField = z
  .string()
  .trim()
  .min(1, "Chọn tháng")
  .transform((value) => toPeriod(value))
  .refine((value): value is string => value !== null, { message: "Tháng không hợp lệ" });

export const meterReadingSchema = z
  .object({
    roomId: z.string().min(1, "Thiếu phòng"),
    period: periodField,
    electricStart: meterValue("Chỉ số điện đầu kỳ"),
    electricEnd: meterValue("Chỉ số điện cuối kỳ"),
    waterStart: meterValue("Chỉ số nước đầu kỳ"),
    waterEnd: meterValue("Chỉ số nước cuối kỳ"),
    note: z
      .string()
      .trim()
      .max(500, "Ghi chú tối đa 500 ký tự")
      .optional()
      .transform((value) => (value ? value : null)),
  })
  // Kiểm ở đây để lỗi hiện ngay dưới ô người ta gõ sai. Database cũng có
  // constraint tương ứng — đây là trải nghiệm, cái kia là bảo đảm.
  .superRefine((value, ctx) => {
    if (value.electricEnd < value.electricStart) {
      ctx.addIssue({
        code: "custom",
        path: ["electricEnd"],
        message: "Chỉ số điện cuối kỳ phải lớn hơn hoặc bằng đầu kỳ",
      });
    }
    if (value.waterEnd < value.waterStart) {
      ctx.addIssue({
        code: "custom",
        path: ["waterEnd"],
        message: "Chỉ số nước cuối kỳ phải lớn hơn hoặc bằng đầu kỳ",
      });
    }
  });

export type MeterReadingFormValues = z.infer<typeof meterReadingSchema>;
