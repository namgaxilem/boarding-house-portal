import type { Metadata } from "next";

import { houseConfig } from "@/config/site";
import { env } from "@/lib/env";

/**
 * Metadata dùng chung cho mọi trang.
 *
 * Mỗi trang trước đây chỉ khai đúng `{ title: "…" }`. Đủ cho thanh tab, nhưng
 * dán link vào Zalo/Messenger/Facebook thì thẻ xem trước lấy gì cũng không có:
 * không og:title riêng, không og:description, không canonical. `pageMeta()` gom
 * cả bộ đó về một lời gọi để không có trang nào khai thiếu một nửa.
 *
 * Trang /admin KHÔNG dùng file này — nội dung quản trị không bao giờ ra ngoài,
 * và chúng thừa hưởng `robots: noindex` của layout gốc.
 */

/**
 * Gốc URL tuyệt đối của site.
 *
 * og:image, canonical và sitemap đều BẮT BUỘC là URL tuyệt đối — thẻ xem trước
 * của Zalo/Facebook được máy chủ của họ tải về, "/opengraph-image.png" với họ
 * là đường dẫn trên chính máy chủ đó. Thiếu `metadataBase` thì Next cảnh báo
 * lúc build rồi tự điền `http://localhost:3000`, và link chia sẻ ra ngoài mất
 * ảnh.
 *
 * Đặt `NEXT_PUBLIC_SITE_URL` trên Vercel = tên miền thật. Local để trống thì
 * `env.siteUrl` trả về http://localhost:3000, đúng thứ cần khi chạy máy mình.
 */
export const siteUrl = env.siteUrl.replace(/\/+$/, "");

/** `new URL()` cho `metadataBase` ở layout gốc. */
export const metadataBase = new URL(siteUrl);

/** Nối path thành URL tuyệt đối. `absoluteUrl("/rooms")` → `https://…/rooms`. */
export function absoluteUrl(path: string) {
  return `${siteUrl}${path === "/" ? "" : path}`;
}

/**
 * Cho trang công khai: cho phép lập chỉ mục, và cho Google hiện ảnh lớn.
 *
 * `max-image-preview: large` là thứ quyết định kết quả tìm kiếm trên điện thoại
 * hiện ảnh phòng cỡ lớn hay một hình vuông tem thư. Với một trang cho thuê
 * phòng thì đó là khác biệt đáng kể về lượt bấm.
 */
export const indexable: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

/**
 * Cho mọi trang sau đăng nhập. Layout gốc đã đặt sẵn mức này, nên bình thường
 * không phải khai lại — hằng số ở đây để khai TƯỜNG MINH ở những chỗ đáng sợ
 * nhất nếu lỡ tay (cổng người thuê), và để đọc code thấy ngay ý định.
 */
export const noIndex: Metadata["robots"] = { index: false, follow: false };

/**
 * Ảnh xem trước mặc định, khai TƯỜNG MINH.
 *
 * Next có quy ước tự động: đặt `src/app/opengraph-image.png` là mọi route được
 * gắn og:image, không phải khai gì. Quy ước đó gắn ảnh ở TỪNG SEGMENT, và
 * `openGraph` của segment con THAY THẾ nguyên khối của cha chứ không trộn vào.
 * Nên ngay khi một trang khai `openGraph` để có og:title riêng, ảnh mà layout
 * gốc nhận được từ quy ước đó biến mất — thẻ chia sẻ trơ chữ, không ảnh.
 *
 * Vì vậy `pageMeta()` gắn lại ảnh ở mỗi trang. Đường dẫn dưới đây LÀ route mà
 * quy ước kia sinh ra từ `src/app/opengraph-image.png` (file do
 * `npm run icons` ghi) — không phải file thứ hai, không có gì phải đồng bộ.
 */
export const defaultOgImage = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: `Logo ${houseConfig.name}`,
};

export interface PageSeo {
  /** Tiêu đề riêng của trang, KHÔNG kèm tên nhà trọ — template ở layout gốc tự nối. */
  title: string;
  /** 1–2 câu. Đây là dòng chữ hiện dưới tiêu đề trong kết quả tìm kiếm và thẻ chia sẻ. */
  description: string;
  /**
   * Đường dẫn trong site, ví dụ "/rooms". Dùng cho canonical và og:url.
   *
   * Bỏ trống ở route động sau đăng nhập (`/me/invoices/[invoiceId]`): một
   * canonical trỏ vào đường dẫn khuôn mẫu là canonical SAI — nó gộp mọi hoá đơn
   * thành cùng một URL. Những trang đó `noindex` sẵn nên không cần canonical.
   */
  path?: string;
  /**
   * Ảnh xem trước riêng của trang, URL tuyệt đối.
   *
   * Bỏ trống là ĐÚNG với hầu hết trang: Next tự gắn `src/app/opengraph-image.png`
   * cho mọi route, không phải khai gì. Chỉ truyền khi trang có ảnh riêng thật
   * sự (ví dụ ảnh phòng), vì giá trị ở đây ĐÈ LÊN ảnh mặc định.
   */
  images?: string[];
}

/**
 * Dựng metadata đầy đủ cho một trang.
 *
 * `openGraph.title` dùng dạng `{ absolute }` chứ không phải chuỗi thường: chuỗi
 * thường bị template `%s · Nhà trọ 1-47` của layout gốc nối thêm một lần nữa,
 * ra "Phòng trống · Nhà trọ 1-47 · Nhà trọ 1-47". Dạng `absolute` bỏ qua template.
 */
export function pageMeta({ title, description, path, images }: PageSeo): Metadata {
  const fullTitle = `${title} · ${houseConfig.name}`;
  const preview = images ?? [defaultOgImage];

  return {
    title,
    description,

    // Một trang, một URL chuẩn. Không có canonical thì `/rooms?ref=zalo` và
    // `/rooms` bị coi là hai trang trùng nội dung, và Google tự chọn cái nào
    // được xếp hạng.
    ...(path ? { alternates: { canonical: path } } : {}),

    openGraph: {
      title: { absolute: fullTitle },
      description,
      ...(path ? { url: path } : {}),
      siteName: houseConfig.name,
      locale: "vi_VN",
      type: "website",
      images: preview,
    },

    // Không chỉ cho X: Zalo, Slack, Discord và vài ứng dụng chat khác đọc thẻ
    // `twitter:*` khi thiếu `og:*` tương ứng. Rẻ, nên khai luôn.
    twitter: {
      card: "summary_large_image",
      title: { absolute: fullTitle },
      description,
      images: preview,
    },
  };
}
