"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser, requireAdmin, requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { HOME_PATH } from "@/lib/constants";
import { describeError, fail, invalid, ok, type ActionResult } from "@/lib/action-result";

import {
  accountSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "./schema";

/** Only allow relative paths — an absolute `next` would be an open redirect. */
function safeNext(next: string | undefined, fallback: string) {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function signIn(
  _prev: ActionResult<never> | null,
  formData: FormData,
): Promise<ActionResult<never> | null> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);

  const { email, password, next } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Deliberately vague: a distinct "no such account" message would let anyone
  // enumerate which emails are registered.
  if (error) return fail("Email hoặc mật khẩu không đúng.");

  const user = await getCurrentUser();
  if (!user) {
    await supabase.auth.signOut();
    return fail("Tài khoản đã bị khoá. Liên hệ chủ trọ.");
  }

  // redirect() throws a control-flow exception — nothing after it runs.
  redirect(safeNext(next, HOME_PATH[user.role]));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password`,
  });

  // Always the same answer, whether or not the email exists.
  return ok("Nếu email tồn tại, link đặt lại mật khẩu đã được gửi. Kiểm tra hộp thư.");
}

export async function resetPassword(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail("Link đã hết hạn hoặc không hợp lệ. Yêu cầu link mới.");

  return ok("Đã đổi mật khẩu. Đăng nhập lại để tiếp tục.");
}

export async function changePassword(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();

  // Supabase has no "verify current password" call, so re-authenticate instead.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return invalid({
      issues: [{ path: ["currentPassword"], message: "Mật khẩu hiện tại không đúng" }],
    });
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return fail("Không đổi được mật khẩu. Thử lại sau.");

  return ok("Đã đổi mật khẩu.");
}

/**
 * Sửa họ tên và email của CHÍNH tài khoản đang đăng nhập.
 *
 * `requireAdmin`, không phải `requireUser` — cố ý.
 *
 * Server Action là endpoint POST công khai: dùng `requireUser` ở đây là đồng
 * thời cho MỌI người thuê tự đổi email đăng nhập của họ. App này không có tính
 * năng đó — tài khoản do chủ trọ tạo, người thuê không tự đăng ký được
 * (`enable_signup = false`) và cũng không tự sửa được số CCCD. Để họ lặng lẽ đổi
 * email là phá mất bản ghi "ai là ai" mà chủ trọ đã nhập.
 *
 * Chỉ sửa hàng của người đang đăng nhập: id lấy từ phiên, KHÔNG nhận từ form.
 * Nhận id từ form là mở đường cho một chủ trọ sửa tài khoản chủ trọ khác.
 */
export async function updateAccount(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const user = await requireAdmin();

  const parsed = accountSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    currentPassword: formData.get("currentPassword") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);

  const { fullName, email, currentPassword } = parsed.data;
  const emailChanged = email !== user.email.toLowerCase();

  // Đổi tên hiển thị thì không bắt gõ mật khẩu — đó là thay đổi vô hại. Đổi
  // email là đổi thứ dùng để ĐĂNG NHẬP, và gõ sai một ký tự là tự khoá mình ra
  // ngoài; chỗ đó phải chắc chắn đúng là chủ tài khoản đang ngồi trước máy.
  if (emailChanged) {
    if (!currentPassword) {
      return invalid({
        issues: [
          { path: ["currentPassword"], message: "Nhập mật khẩu để xác nhận đổi email" },
        ],
      });
    }

    const supabase = await createClient();
    // Supabase không có lệnh "kiểm mật khẩu này đúng không", nên đăng nhập lại
    // bằng email HIỆN TẠI là cách duy nhất để xác thực.
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (error) {
      return invalid({
        issues: [{ path: ["currentPassword"], message: "Mật khẩu không đúng" }],
      });
    }
  }

  try {
    await db.updateOwnAccount(user.id, { fullName, email });
  } catch (error) {
    return fail(describeError(error, "Không cập nhật được tài khoản."));
  }

  // Phiên đăng nhập vẫn sống (cùng user id), nhưng JWT còn mang email cũ cho tới
  // lần làm mới sau. Giao diện không bị ảnh hưởng: `getCurrentUser()` đọc email
  // từ `profiles`, không đọc từ token.
  revalidatePath("/admin/settings/account");
  revalidatePath("/admin", "layout");

  return ok(
    emailChanged
      ? `Đã lưu. Từ lần sau đăng nhập bằng ${email} — mật khẩu giữ nguyên.`
      : "Đã lưu thông tin tài khoản.",
  );
}
