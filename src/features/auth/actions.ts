"use server";

import { redirect } from "next/navigation";

import { getCurrentUser, requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { HOME_PATH } from "@/lib/constants";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";

import {
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
