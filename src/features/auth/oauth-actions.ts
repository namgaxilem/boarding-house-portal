"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { houseConfig } from "@/config/site";

/**
 * Bắt đầu luồng đăng nhập Google / Facebook.
 *
 * Supabase hỗ trợ sẵn hai provider này, nên chỉ cần xin URL rồi chuyển hướng.
 * Zalo thì khác — Supabase không hỗ trợ, xem `src/lib/auth/zalo.ts`.
 */

type SupabaseProvider = "google" | "facebook";

/** Chỉ nhận đường dẫn tương đối — `next` tuyệt đối là lỗ hổng open redirect. */
function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/me";
}

async function startOAuth(provider: SupabaseProvider, formData: FormData) {
  if (!houseConfig.login[provider]) {
    // Bấm được nút này nghĩa là ai đó gọi thẳng Server Action, vì UI đã ẩn nó.
    redirect(`/login?error=${encodeURIComponent("Cách đăng nhập này chưa được bật.")}`);
  }

  const supabase = await createClient();
  const nextPath = safeNext(formData.get("next"));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      // Chỉ xin những gì thật sự cần: định danh + email để khớp tài khoản.
      scopes: provider === "google" ? "openid email profile" : "email public_profile",
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent("Không mở được trang đăng nhập. Thử lại sau.")}`,
    );
  }

  redirect(data.url);
}

export async function signInWithGoogle(formData: FormData) {
  await startOAuth("google", formData);
}

export async function signInWithFacebook(formData: FormData) {
  await startOAuth("facebook", formData);
}

export async function signInWithZalo(formData: FormData) {
  if (!houseConfig.login.zalo) {
    redirect(`/login?error=${encodeURIComponent("Đăng nhập Zalo chưa được bật.")}`);
  }
  redirect(`/auth/zalo?next=${encodeURIComponent(safeNext(formData.get("next")))}`);
}
