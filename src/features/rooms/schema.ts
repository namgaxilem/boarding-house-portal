import { z } from "zod";

const money = (label: string) =>
  z.coerce
    .number({ error: `${label} phải là số` })
    .int(`${label} phải là số nguyên`)
    .min(0, `${label} không được âm`)
    .max(1_000_000_000, `${label} lớn bất thường, kiểm tra lại`);

export const roomSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Nhập mã phòng")
    .max(20, "Mã phòng tối đa 20 ký tự")
    .regex(/^[\p{L}\p{N}\s.-]+$/u, "Mã phòng chỉ gồm chữ, số, dấu chấm và gạch ngang"),
  floor: z.coerce
    .number({ error: "Tầng phải là số" })
    .int("Tầng phải là số nguyên")
    .min(0, "Tầng không hợp lệ")
    .max(50, "Tầng không hợp lệ"),
  areaM2: z.coerce
    .number({ error: "Diện tích phải là số" })
    .min(1, "Diện tích phải lớn hơn 0")
    .max(1000, "Diện tích lớn bất thường"),
  basePrice: money("Giá thuê"),
  electricPrice: money("Giá điện"),
  waterPrice: money("Giá nước"),
  servicePrice: money("Phí dịch vụ"),
  maxOccupants: z.coerce
    .number({ error: "Số người tối đa phải là số" })
    .int()
    .min(1, "Ít nhất 1 người")
    .max(20, "Nhiều bất thường, kiểm tra lại"),
  status: z.enum(["vacant", "occupied", "maintenance", "reserved"], {
    error: "Chọn trạng thái phòng",
  }),
  description: z
    .string()
    .trim()
    .max(1000, "Mô tả tối đa 1000 ký tự")
    .optional()
    .transform((value) => (value ? value : null)),
});

export const roomEventSchema = z.object({
  roomId: z.string().min(1),
  type: z.enum(
    ["checkin", "checkout", "maintenance", "price_change", "incident", "note"],
    { error: "Chọn loại sự kiện" },
  ),
  title: z.string().trim().min(1, "Nhập tiêu đề").max(200, "Tiêu đề tối đa 200 ký tự"),
  content: z
    .string()
    .trim()
    .max(2000, "Nội dung tối đa 2000 ký tự")
    .optional()
    .transform((value) => (value ? value : null)),
  cost: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || (Number.isFinite(value) && value >= 0), {
      message: "Chi phí phải là số không âm",
    }),
  occurredAt: z.string().min(1, "Chọn ngày xảy ra"),
});

export type RoomFormValues = z.infer<typeof roomSchema>;
