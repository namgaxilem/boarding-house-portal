import "server-only";

import { cache } from "react";

import { requireAdmin, requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { PostFilter } from "@/lib/db";

/**
 * Guard lặp lại ở đây dù layout đã gọi — cố ý, và vì đúng lý do ghi ở
 * `features/gate/queries.ts`: RLS mới là lớp chặn thật, nhưng gọi guard ở đây
 * thì người gõ tay `/admin/posts` nhận được một lần chuyển hướng thay vì một
 * trang trống trông như lỗi.
 *
 * Trang công khai KHÔNG đi qua file này — nó đọc qua `lib/db/public-posts.ts`,
 * vốn chạy trong `"use cache"` và không được chạm cookie.
 */

export const listPostsForAdmin = cache(async (filter?: PostFilter) => {
  await requireAdmin();
  return db.listPosts(filter);
});

export const listPendingPosts = cache(async () => {
  await requireAdmin();
  return db.listPendingPosts();
});

export const getPostForAdmin = cache(async (id: string) => {
  await requireAdmin();
  return db.getPost(id);
});

export const listMyPosts = cache(async () => {
  const user = await requireUser();
  return db.listPostsByAuthor(user.id);
});

/**
 * Một bài của chính mình. RLS đã chặn bài của người khác, nhưng trả `null` thay
 * vì để trang dựng nửa vời thì thông báo "không tìm thấy" mới đúng sự thật.
 */
export const getMyPost = cache(async (id: string) => {
  await requireUser();
  return db.getPost(id);
});

/** Bảng tin cho người đã đăng nhập: bài đã đăng, cả nội bộ lẫn công khai. */
export const listInternalFeed = cache(async (limit?: number) => {
  await requireUser();
  return db.listInternalFeed(limit);
});
