import { z } from "zod";

export const wifiSchema = z
  .object({
    ssid: z.string().trim().min(1, "Nhập tên mạng (SSID)").max(64, "Tối đa 64 ký tự"),
    password: z.string().trim().min(1, "Nhập mật khẩu wifi").max(64, "Tối đa 64 ký tự"),
    scope: z.enum(["global", "floor", "room"], { error: "Chọn phạm vi áp dụng" }),
    roomId: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : null)),
    floor: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? Number(value) : null)),
    note: z
      .string()
      .trim()
      .max(300, "Ghi chú tối đa 300 ký tự")
      .optional()
      .transform((value) => (value ? value : null)),
  })
  // Mirrors the `wifi_scope_target` CHECK constraint in the database, so the user
  // gets a field-level message instead of a raw Postgres error.
  .refine((data) => data.scope !== "room" || data.roomId !== null, {
    message: "Chọn phòng áp dụng",
    path: ["roomId"],
  })
  .refine(
    (data) => data.scope !== "floor" || (data.floor !== null && Number.isFinite(data.floor)),
    { message: "Nhập số tầng", path: ["floor"] },
  )
  .transform((data) => ({
    ...data,
    roomId: data.scope === "room" ? data.roomId : null,
    floor: data.scope === "floor" ? data.floor : null,
  }));
