import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} tối đa ${max} ký tự`)
    .optional()
    .transform((value) => (value ? value : null));

export const tenantSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Nhập email")
    .email("Email chưa đúng định dạng")
    .transform((value) => value.toLowerCase()),
  fullName: z
    .string()
    .trim()
    .min(2, "Nhập họ tên đầy đủ")
    .max(120, "Họ tên tối đa 120 ký tự"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.replace(/\s/g, "") : null))
    .refine((value) => value === null || /^0\d{9}$/.test(value), {
      message: "Số điện thoại phải có 10 số và bắt đầu bằng 0",
    }),
  dateOfBirth: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || !Number.isNaN(Date.parse(value)), {
      message: "Ngày sinh không hợp lệ",
    }),
  hometown: optionalText(120, "Quê quán"),
  note: optionalText(1000, "Ghi chú"),
});

export const createTenantSchema = tenantSchema.extend({
  password: z
    .string()
    .min(6, "Mật khẩu tạm cần ít nhất 6 ký tự")
    .max(72, "Mật khẩu tối đa 72 ký tự"),
});

/** Tenants editing their own profile cannot touch email, note or role. */
export const ownProfileSchema = tenantSchema.pick({
  fullName: true,
  phone: true,
  dateOfBirth: true,
  hometown: true,
});

export type TenantFormValues = z.infer<typeof tenantSchema>;
