import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

/**
 * Thông báo của chính người đang đăng nhập.
 *
 * `cache()` vì chuông ở header và danh sách trong trang cùng hỏi một thứ trong
 * một lần render.
 */
export const listMyNotifications = cache(async (limit = 50) => {
  const user = await requireUser();
  return db.listNotifications(user.id, limit);
});

export const countMyUnread = cache(async () => {
  const user = await requireUser();
  return db.countUnreadNotifications(user.id);
});
