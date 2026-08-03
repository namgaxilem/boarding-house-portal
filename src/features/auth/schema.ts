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
