import type { NextConfig } from "next";

/**
 * Ảnh phòng nằm ở Supabase Storage, nên `next/image` phải được cho phép tải từ
 * host đó. Lấy thẳng từ biến môi trường để local (127.0.0.1:54321) và cloud
 * (<ref>.supabase.co) đều chạy mà không phải sửa file này.
 */
function supabaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

const supabase = supabaseUrl();

/** 127.0.0.1, localhost, 10.x, 192.168.x, 172.16–31.x */
function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

const nextConfig: NextConfig = {
  // Cache Components (Next 16): dữ liệu là dynamic mặc định, phần nào muốn cache
  // thì đánh dấu `use cache`. Bật cờ này cũng bật Partial Prerendering + kiểm tra
  // Instant Navigation (`instant`) và React <Activity> giữ state khi điều hướng.
  cacheComponents: true,

  // Prefetch một "App Shell" dùng chung cho mỗi route thay vì prefetch riêng cho
  // từng <Link>. Trang danh sách phòng có 10 link trỏ về cùng một route động —
  // trước là 10 lần tải, giờ là 1. Đây cũng là thứ khiến điều hướng lúc mạng chập
  // chờn vẫn hiện được khung trang ngay (xem experimental.useOffline bên dưới).
  // Yêu cầu cacheComponents — thiếu là next build lỗi ngay ở bước đọc config.
  partialPrefetching: true,

  images: {
    remotePatterns: supabase
      ? [
          {
            protocol: supabase.protocol.replace(":", "") as "http" | "https",
            hostname: supabase.hostname,
            port: supabase.port || undefined,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],

    // Next.js 16 chặn tối ưu ảnh từ IP nội bộ (thay đổi phá vỡ tương thích).
    // Supabase chạy local là 127.0.0.1:54321 nên sẽ bị chặn, `next/image` trả
    // 400 và ảnh không hiện.
    //
    // Chỉ mở khi host Supabase THỰC SỰ là địa chỉ nội bộ. Trỏ sang project
    // cloud (*.supabase.co) là cờ này tự tắt — không có cách nào quên.
    dangerouslyAllowLocalIP: supabase ? isLocalHostname(supabase.hostname) : false,
  },

  experimental: {
    serverActions: {
      // Ảnh đã được resize trong trình duyệt xuống ~300–500KB, nhưng cho phép
      // chọn nhiều ảnh một lần nên cần nới mức mặc định 1MB.
      bodySizeLimit: "12mb",
    },

    // KHÔNG bật `useOffline`. App yêu cầu có mạng. Cờ đó giữ request thất bại ở
    // trạng thái chờ rồi tự chạy lại — nghe hay, nhưng giao diện khi đó đứng im
    // không phân biệt được với treo, và người dùng không có cách nào huỷ.
  },

  async headers() {
    return [
      {
        // Service worker KHÔNG được cache. Trình duyệt cache sw.js một ngày là
        // bản vá của bạn cũng nằm chờ một ngày mới tới được máy người dùng.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        // File wasm của bộ giải mã QR có hash trong nội dung và không bao giờ
        // đổi trong một phiên bản zxing-wasm — cache thoải mái một năm.
        source: "/zxing_reader.wasm",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Content-Type", value: "application/wasm" },
        ],
      },
    ];
  },
};

export default nextConfig;
