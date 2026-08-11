import type { MetadataRoute } from "next";

import { houseConfig } from "@/config/site";

/**
 * Web app manifest — thứ biến trang web thành app cài được.
 *
 * Next phục vụ file này tại `/manifest.webmanifest`. Đường dẫn đó PHẢI nằm trong
 * danh sách công khai của `src/proxy.ts`: trình duyệt tải manifest trước khi có
 * phiên đăng nhập, bị chuyển hướng về /login là nút "Cài đặt" biến mất.
 *
 * Icon lấy từ `public/icons/`, sinh bằng `npm run icons` (xem scripts/generate-icons.mjs).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: houseConfig.name,
    short_name: houseConfig.shortName,
    description: houseConfig.description,

    // Mở app vào thẳng cổng người thuê. Ai chưa đăng nhập sẽ được proxy đẩy sang
    // /login rồi quay lại — đúng luồng mong muốn. Trỏ vào "/" thì người thuê phải
    // bấm thêm một lần từ trang giới thiệu mỗi lần mở app.
    start_url: "/me",
    scope: "/",

    // `standalone` bỏ thanh địa chỉ. Không dùng `fullscreen`: mất luôn đồng hồ và
    // sóng của hệ thống, người dùng thấy lạ chứ không thấy sang.
    display: "standalone",
    orientation: "portrait",

    // Khớp với themeColor trong app/layout.tsx. Lệch nhau thì lúc khởi động app
    // sẽ chớp một màu rồi đổi sang màu khác.
    background_color: "#fbfaf7",
    theme_color: "#fbfaf7",

    lang: "vi",
    dir: "ltr",
    categories: ["utilities", "lifestyle"],

    icons: [
      // `purpose: "any"` — icon hiện nguyên vẹn, có nền riêng.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },

      // `maskable` — Android cắt icon theo hình của launcher (tròn, vuông bo,
      // giọt nước). Thiếu bộ này thì icon bị bo mất góc hoặc lọt thỏm trong một
      // ô trắng. Ảnh maskable phải chừa 20% viền an toàn quanh logo.
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    // Bấm giữ icon trên màn hình chính → menu tắt. Android hỗ trợ, iOS bỏ qua.
    shortcuts: [
      { name: "Phòng của tôi", url: "/me/room" },
      { name: "Mật khẩu wifi", url: "/me/wifi" },
    ],
  };
}
