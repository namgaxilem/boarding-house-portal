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
  },
};

export default nextConfig;
