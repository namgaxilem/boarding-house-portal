import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

/**
 * robots.txt — Next phục vụ file này tại `/robots.txt`.
 *
 * Hai tầng chặn, làm hai việc KHÁC nhau, và cần cả hai:
 *
 *   robots.txt (file này)  — "đừng TẢI những đường dẫn này". Tiết kiệm lượt bò
 *                            của bot, và giữ cho khu riêng tư không bị dò lung
 *                            tung. Nhưng nó KHÔNG chặn lập chỉ mục: một URL bị
 *                            disallow mà có người khác dẫn link tới vẫn có thể
 *                            xuất hiện trong kết quả (dạng trơ, không mô tả).
 *   `robots: noIndex`      — "đừng ĐƯA vào chỉ mục". Đây mới là thứ chặn thật,
 *     ở layout gốc            và nó là mặc định của toàn site.
 *
 * Chặn ở đây vô hại vì ba khu dưới đều nằm sau đăng nhập: bot chưa đăng nhập có
 * tải cũng chỉ nhận về trang /login.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", // khu quản trị
        "/me", // cổng người thuê
        "/api", // health check, cron
        "/auth", // callback của Supabase Auth
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
