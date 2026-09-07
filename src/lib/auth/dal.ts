import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { assertSupabaseConfigured } from "@/lib/env";
import { HOME_PATH } from "@/lib/constants";
import type { SessionUser } from "@/types";

/**
 * Data Access Layer.
 *
 * Every server-side read of "who is signed in" goes through here. `cache()`
 * memoizes it per render pass, so a layout, a page and three leaf components all
 * asking for the user cost one lookup.
 *
 * Route guards live here rather than in each page, so a new page cannot forget
 * them: `requireAdmin()` is the only way to obtain an admin user object.
 */

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  assertSupabaseConfigured();

  const supabase = await createClient();

  // getUser() re-verifies the JWT with the Auth server. getSession() only reads
  // the cookie and would trust a forged one — never use it for authorization.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await db.getProfile(user.id);

  // The database is authoritative: a role demoted or an account disabled after
  // the session was issued must take effect on the very next request.
  if (!profile || !profile.isActive) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
  };
});

export async function requireUser(): Promise<SessionUser> {
  // `await connection()` TRƯỚC khi đọc phiên đăng nhập.
  //
  // Client Supabase kiểm hạn access token bằng `Date.now()`. Dưới Cache
  // Components (bật ở next.config.ts) Next cố prerender mọi thứ, gặp giá trị đó
  // thì dừng và ghi `blocking-prerender-current-time` — một dòng ERROR cho MỌI
  // lần vào MỌI trang có guard. Log đầy tiếng ồn thì lỗi thật không ai thấy:
  // đúng như vậy mà lỗi embed ở /admin/gate nằm lẫn trong đó một thời gian.
  //
  // Đặt ở ĐÂY, không đặt trong `getCurrentUser`: hàm đó bọc `cache()`, nên từ
  // lượt render thứ hai nó trả lại promise đã ghi nhớ và `connection()` không
  // chạy nữa — Next vẫn thấy `Date.now()` trong lượt prerender. Cùng cái bẫy đã
  // ghi ở `features/dashboard/queries.ts`.
  //
  // Không mất gì về hiệu năng: trang nào có guard thì vốn đã đọc cookie, tức là
  // đã luôn là dữ liệu thời-điểm-yêu-cầu.
  await connection();

  const user = await getCurrentUser();

  // `?expired=1` matters: the visitor may still be holding a structurally valid
  // session cookie for an account that was since deleted or disabled. Without
  // the marker the proxy would see "signed in", bounce them back here, and the
  // two would redirect at each other forever. The proxy clears the cookies when
  // it sees this flag.
  if (!user) redirect("/login?expired=1");

  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect(HOME_PATH.tenant);
  return user;
}
