import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "./index";
import { houseConfig } from "@/config/site";
import { POSTS_PER_PAGE } from "@/lib/constants";
import type { PostDetail, PostPage } from "@/types";

/**
 * Bài viết công khai cho `/blog`, `/blog/<slug>` và `/sitemap.xml`.
 *
 * KHÔNG dùng React `cache()` như `public-rooms.ts` — dùng `"use cache"` của Next.
 * Hai thứ khác nhau: `cache()` gộp các lần gọi TRONG MỘT lượt render, còn
 * `"use cache"` giữ kết quả qua NHIỀU request. Đó mới là thứ trang blog cần —
 * Googlebot cùng mười khách vãng lai phải dùng chung một truy vấn, không phải
 * mười một.
 *
 * ĐIỀU KIỆN của `"use cache"`: bên trong không được chạm `cookies()`,
 * `headers()` hay `Date.now()`. `createClient()` mặc định của repo ĐỌC COOKIE
 * (lib/supabase/server.ts), nên các hàm `...Public...` trong adapter dùng
 * `createPublicClient()` và để policy `posts_select_anon` lọc dòng. Đây cũng là
 * lý do migration 0013 cấp quyền theo cột cho `anon` thay vì dựng một RPC.
 *
 * Làm mới KHÔNG đi qua `revalidatePath`. Một entry `"use cache"` được đánh khoá
 * theo hàm + tham số, nên `revalidatePath("/blog")` không chạm tới nó — phải gọi
 * `revalidateTag("posts-public")`. Xem `revalidatePosts()` trong
 * `features/posts/actions.ts`.
 */

export const POSTS_PUBLIC_TAG = "posts-public";

export function postTag(slug: string) {
  return `post:${slug}`;
}

export async function listPublicPosts(page: number): Promise<PostPage> {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_PUBLIC_TAG);

  if (!houseConfig.features.publicBlog) {
    return { items: [], total: 0, page: 1, pageCount: 1 };
  }
  return db.listPublicPosts(page, POSTS_PER_PAGE);
}

export async function getPublicPost(slug: string): Promise<PostDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_PUBLIC_TAG, postTag(slug));

  if (!houseConfig.features.publicBlog) return null;
  return db.getPublicPost(slug);
}

/**
 * Danh sách cho sitemap. KHÔNG bao giờ ném lỗi — khác hai hàm trên.
 *
 * `/sitemap.xml` được prerender lúc `next build`. Để nó ném lỗi nghĩa là một
 * trục trặc database, hoặc một migration chưa kịp chạy, làm HỎNG CẢ BẢN BUILD và
 * chặn luôn việc deploy những thay đổi chẳng liên quan gì tới bài viết. Một
 * sitemap thiếu vài URL trong một lần deploy thì Google bò lại ở lần sau; một
 * deploy không chạy được thì không.
 *
 * Dòng log là tín hiệu duy nhất, giống `[storage]` và `[notify]`. Thấy nó trong
 * log build nghĩa là `supabase db push` chưa chạy.
 */
export async function listPublicPostSitemapEntries() {
  "use cache";
  cacheLife("hours");
  cacheTag(POSTS_PUBLIC_TAG);

  if (!houseConfig.features.publicBlog) return [];

  try {
    return await db.listPublicPostSitemapEntries();
  } catch (error) {
    console.error("[sitemap] không đọc được danh sách bài viết", error);
    return [];
  }
}
