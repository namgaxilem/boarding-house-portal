import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

/**
 * Sitemap — Next phục vụ file này tại `/sitemap.xml`.
 *
 * CHỈ liệt kê trang công khai. Đường dẫn ở đây phải khớp với hai chỗ khác, và
 * lệch nhau thì hỏng lặng lẽ:
 *   - `PUBLIC_PATHS` trong src/proxy.ts — không có trong đó thì khách chưa đăng
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
 * KHÔNG có `lastModified`. Hai lý do, lý do thứ hai mới là lý do cứng:
 *   1. `changeFrequency` và `priority` bị Google bỏ qua hoàn toàn, còn
 *      `lastModified` chỉ được tin khi nó thật sự chính xác — một mốc thời gian
 *      đổi theo mỗi lần deploy thì tệ hơn là không có.
 *   2. `cacheComponents` prerender route này, và `new Date()` trong lúc
 *      prerender ném thẳng lỗi "encountered the unstable value Date.now()".
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/rooms", "/contact"].map((path) => ({ url: absoluteUrl(path) }));
}
