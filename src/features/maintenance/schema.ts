import { z } from "zod";

const title = z
  .string()
  .trim()
  .min(3, "Mô tả ngắn gọn hỏng cái gì")
  .max(120, "Tiêu đề tối đa 120 ký tự");

const description = z
  .string()
  .trim()
  .max(2000, "Mô tả tối đa 2000 ký tự")
  .optional()
  .transform((value) => (value ? value : null));

const priority = z.enum(["low", "normal", "urgent"], { error: "Chọn mức độ" });

/**
 * Người thuê gửi phiếu.
 *
 * Không có `roomId`: phòng được suy ra ở server từ hợp đồng đang hiệu lực của
 * chính họ. Nhận `roomId` từ form là mở đường cho một người thuê báo hỏng hộ
 * phòng khác — RLS chặn được, nhưng chặn ở tầng nào cũng không bằng không bao
 * giờ đọc giá trị đó.
 */
export const tenantRequestSchema = z.object({
  title,
  description,
  priority,
});

/** Chủ trọ tự ghi, hoặc ghi hộ khi người thuê gọi điện — phải chọn phòng. */
export const adminRequestSchema = tenantRequestSchema.extend({
  roomId: z.string().min(1, "Chọn phòng"),
});

/**
 * Chủ trọ đổi trạng thái.
 *
 * `cost` đi vào nhật ký phòng (`room_events`) chứ không vào phiếu — người thuê
 * đọc được dòng phiếu của mình, và giá thợ báo không phải việc của họ.
 */
export const statusSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["open", "in_progress", "resolved"], { error: "Chọn trạng thái" }),
  resolutionNote: z
    .string()
    .trim()
    .max(1000, "Ghi chú tối đa 1000 ký tự")
    .optional()
    .transform((value) => (value ? value : null)),
  cost: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value.replace(/[.\s]/g, "")) : null))
    .refine((value) => value === null || (Number.isFinite(value) && value >= 0), {
      message: "Chi phí phải là số không âm",
    }),
});

/** Đóng phiếu — dùng chung cho cả hai bên, chỉ khác ai được bấm. */
export const closeSchema = z.object({
  requestId: z.string().min(1),
  note: z
    .string()
    .trim()
    .max(1000, "Ghi chú tối đa 1000 ký tự")
    .optional()
    .transform((value) => (value ? value : null)),
});
