import type { MetadataRoute } from "next";

import { listPublicPostSitemapEntries } from "@/lib/db/public-posts";
import { absoluteUrl } from "@/lib/seo";

/**
 * Sitemap — Next phục vụ file này tại `/sitemap.xml`.
 *
 * CHỈ liệt kê trang công khai. Đường dẫn ở đây phải khớp với hai chỗ khác, và
 * lệch nhau thì hỏng lặng lẽ:
 *   - `src/proxy.ts` — `PUBLIC_PATHS` cho đường dẫn cố định, `PUBLIC_PATH_PREFIXES`
 *     cho phần động như `/blog/<slug>`. Không có trong đó thì khách chưa đăng
 *     nhập (và mọi con bọ tìm kiếm) bị đẩy sang /login, Google thấy một trang
 *     đăng nhập chứ không thấy nội dung;
 *   - `robots: indexable` ở (marketing)/layout.tsx — thiếu thì trang nằm trong
 *     sitemap mà lại mang thẻ `noindex`, đúng kiểu tín hiệu mâu thuẫn mà
 *     Search Console báo lỗi.
 *
 * Trang đăng nhập / quên mật khẩu KHÔNG có ở đây dù chúng công khai: sitemap là
 * lời mời "hãy xếp hạng trang này", còn một form đăng nhập thì không có gì để
 * xếp hạng.
 *
 * `lastModified` CHỈ có ở bài viết, và đó là `updated_at` của chính hàng dữ
 * liệu — một mốc sửa nội dung THẬT. Khác hẳn `new Date()`, vốn vừa là mốc đổi
 * theo mỗi lần deploy (Google không tin, và đúng ra là không nên tin) vừa ném
 * thẳng lỗi "encountered the unstable value Date.now()" khi `cacheComponents`
 * prerender route này. Bốn đường dẫn tĩnh không có mốc nào thật để khai, nên
 * chúng vẫn không khai gì.
 *
 * Phần đọc database nằm sau `"use cache"` (xem `lib/db/public-posts.ts`), nên
 * route này vẫn prerender được. Làm mới đi qua `updateTag("posts-public")` trong
 * Server Action, KHÔNG qua `revalidatePath` — một entry `"use cache"` được đánh
 * khoá theo hàm + tham số và `revalidatePath` không chạm tới nó.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublicPostSitemapEntries();

  return [
    ...["/", "/rooms", "/contact", "/blog"].map((path) => ({ url: absoluteUrl(path) })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: new Date(post.updatedAt),
    })),
  ];
}
