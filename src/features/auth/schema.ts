import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Nhập email")
    .email("Email chưa đúng định dạng"),
  password: z.string().min(1, "Nhập mật khẩu"),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Nhập email").email("Email chưa đúng định dạng"),
});

/**
 * Sửa họ tên và email của CHÍNH tài khoản đang đăng nhập.
 *
 * `currentPassword` để trống được, và điều đó là cố ý: đổi tên hiển thị không
 * đáng bắt gõ lại mật khẩu. Nhưng đổi email là đổi thứ dùng để ĐĂNG NHẬP — chỗ
 * đó bắt buộc phải xác nhận, và việc kiểm "có đổi email hay không" phải làm ở
 * action vì schema không biết email hiện tại là gì.
 */
export const accountSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nhập họ tên")
    .max(80, "Họ tên tối đa 80 ký tự")
    .transform((value) => value.replace(/\s+/g, " ")),
  email: z
    .string()
    .trim()
    .min(1, "Nhập email")
    .email("Email chưa đúng định dạng")
    // Supabase lưu email chữ thường. Không hạ chữ ở đây thì "Nam@Gmail.com" và
    // "nam@gmail.com" trông như hai email khác nhau khi so với email hiện tại,
    // và app sẽ đòi mật khẩu cho một thay đổi không hề xảy ra.
    .transform((value) => value.toLowerCase()),
  currentPassword: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
    newPassword: z.string().min(6, "Mật khẩu mới cần ít nhất 6 ký tự"),
    confirmPassword: z.string().min(1, "Nhập lại mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hai mật khẩu không khớp",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Mật khẩu cần ít nhất 6 ký tự"),
    confirmPassword: z.string().min(1, "Nhập lại mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hai mật khẩu không khớp",
    path: ["confirmPassword"],
  });
