import { houseConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";
import type { RoomWithPhotos } from "@/types";

/**
 * Dữ liệu có cấu trúc (schema.org / JSON-LD) cho các trang công khai.
 *
 * Thẻ Open Graph nói cho Zalo/Facebook biết cách VẼ một thẻ xem trước. JSON-LD
 * nói cho Google biết trang này LÀ CÁI GÌ. Hai việc khác nhau, và cái thứ hai
 * mới là thứ đưa giá thuê, địa chỉ, số điện thoại và giờ mở cửa lên thẳng trang
 * kết quả tìm kiếm.
 *
 * Nguyên tắc xuyên suốt file này: KHÔNG BỊA. Mọi giá trị đều đọc từ
 * `houseConfig` hoặc từ database. Trường nào không có dữ liệu thật thì bỏ hẳn
 * — Google phạt dữ liệu có cấu trúc sai lệch nặng hơn là không có.
 */

/** `@id` chung, để các khối JSON-LD trỏ về cùng một thực thể nhà trọ. */
const BUSINESS_ID = `${absoluteUrl("/")}#lodging`;

/**
 * Giờ tiếp khách, chỉ khai khi chắc chắn là HÀNG NGÀY.
 *
 * `houseConfig.contact.officeHours` là chữ tự do ("07:00 – 21:00 hàng ngày").
 * Đoán bừa lịch từ chữ tự do là cách nhanh nhất để khai sai giờ mở cửa lên
 * Google. Nên chỉ nhận đúng một dạng: có khoảng giờ HH:MM–HH:MM *và* có chữ
 * "hàng ngày". Đổi sang "Thứ 2 – Thứ 6" thì hàm trả về `undefined` và khối
 * `openingHoursSpecification` biến mất, thay vì thành Mo-Su sai.
 */
function openingHours() {
  const text = houseConfig.contact.officeHours;
  if (!/hàng ngày/i.test(text)) return undefined;

  // `–` (en dash) và `-` đều dùng được; `\s*` cho cả hai kiểu gõ.
  const range = /(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/.exec(text);
  if (!range) return undefined;

  return [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: range[1],
      closes: range[2],
    },
  ];
}

/**
 * Nhà trọ, dạng `LodgingBusiness`.
 *
 * `LodgingBusiness` là nhánh con của `LocalBusiness`, đúng loại cho nhà trọ /
 * nhà nghỉ dài hạn. Dùng `LocalBusiness` trơn cũng chạy nhưng mất ngữ cảnh chỗ ở.
 *
 * Khối này gắn ở `(marketing)/layout.tsx` nên có mặt trên cả ba trang công
 * khai. Lặp lại là ĐÚNG với schema.org: cùng một `@id` thì Google hiểu là cùng
 * một thực thể, không phải ba nhà trọ.
 *
 * KHÔNG có `geo` (toạ độ) và `aggregateRating`:
 *   - toạ độ: `houseConfig.address.mapUrl` là link rút gọn của Google Maps,
 *     không chứa lat/lng. Thêm được toạ độ thật vào config thì nên thêm — đó là
 *     tín hiệu mạnh cho kết quả bản đồ địa phương.
 *   - đánh giá: app không có hệ thống đánh giá. Tự khai sao là vi phạm chính
 *     sách dữ liệu có cấu trúc của Google, và bị gỡ toàn bộ rich result.
 */
export function lodgingBusinessJsonLd(): Record<string, unknown> {
  const { address, contact } = houseConfig;
  const hours = openingHours();

  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": BUSINESS_ID,
    name: houseConfig.name,
    description: houseConfig.description,
    url: absoluteUrl("/"),
    image: absoluteUrl("/opengraph-image.png"),
    telephone: contact.phone,
    email: contact.email,

    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      // Phường là đơn vị nhỏ nhất còn lại sau khi bỏ cấp quận, nên nó đóng vai
      // "addressLocality". `district` để rỗng thì không xuất hiện ở đây.
      addressLocality: [address.ward, address.district].filter(Boolean).join(", "),
      addressRegion: address.city,
      addressCountry: "VN",
    },

    ...(address.mapUrl ? { hasMap: address.mapUrl } : {}),
    ...(hours ? { openingHoursSpecification: hours } : {}),

    amenityFeature: houseConfig.amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),

    currenciesAccepted: "VND",
    paymentAccepted: houseConfig.bank ? "Tiền mặt, Chuyển khoản" : "Tiền mặt",
  };
}

/**
 * Danh sách phòng trống, dạng `ItemList` của `Accommodation` + `Offer`.
 *
 * Đây là khối mang GIÁ. Không có nó thì Google biết đây là một nhà trọ nhưng
 * không biết phòng nào còn trống, rộng bao nhiêu, bao nhiêu một tháng — tức là
 * mất đúng ba thông tin người tìm phòng gõ vào ô tìm kiếm.
 *
 * `url` của mọi phòng đều trỏ về `/rooms`: app chưa có trang riêng cho từng
 * phòng. Đó là giới hạn thật, không phải thiếu sót của khối này — có trang
 * riêng thì đổi một dòng ở đây.
 */
export function vacantRoomsJsonLd(rooms: RoomWithPhotos[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Phòng trống tại ${houseConfig.name}`,
    numberOfItems: rooms.length,
    itemListElement: rooms.map((room, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Accommodation",
        name: `Phòng ${room.code}`,
        ...(room.description ? { description: room.description } : {}),
        url: absoluteUrl("/rooms"),
        ...(room.photos.length > 0
          ? { image: room.photos.map((photo) => photo.url) }
          : {}),

        floorSize: {
          "@type": "QuantitativeValue",
          value: room.areaM2,
          // MTK = mét vuông theo UN/CEFACT, mã mà schema.org yêu cầu.
          unitCode: "MTK",
        },
        occupancy: {
          "@type": "QuantitativeValue",
          maxValue: room.maxOccupants,
          unitText: "người",
        },
        floorLevel: String(room.floor),

        offers: {
          "@type": "Offer",
          price: room.basePrice,
          priceCurrency: "VND",
          // Danh sách này chỉ chứa phòng đang trống, nên InStock luôn đúng.
          availability: "https://schema.org/InStock",
          url: absoluteUrl("/rooms"),
          // Giá thuê là giá MỖI THÁNG. Thiếu dòng này thì Google đọc 2.400.000 ₫
          // là giá bán đứt căn phòng.
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: room.basePrice,
            priceCurrency: "VND",
            unitCode: "MON",
            unitText: "tháng",
          },
          seller: { "@id": BUSINESS_ID },
        },
      },
    })),
  };
}

/**
 * Đường dẫn phân cấp — hiện thành "nhatro.com › Phòng trống" thay vì URL trần
 * trong kết quả tìm kiếm.
 *
 * Trang chủ không cần khối này (nó là gốc, không có gì để phân cấp).
 */
export function breadcrumbJsonLd(
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Trang chủ", path: "/" }, ...trail].map(
      (step, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: step.name,
        item: absoluteUrl(step.path),
      }),
    ),
  };
}

/**
 * Một bài viết công khai.
 *
 * Ba trường cố ý VẮNG MẶT, theo nguyên tắc không-bịa của file này:
 *   - `image` chỉ khai khi bài thật sự có ảnh bìa. Trỏ vào logo mặc định là nói
 *     với Google rằng bài có minh hoạ, trong khi nó không có.
 *   - `dateModified` chỉ khai khi khác `datePublished` — bằng nhau thì nó là
 *     tiếng ồn, và lệch nhau vì một lần sửa chính tả thì còn tệ hơn.
 *   - `articleBody` không khai. Google đọc được nội dung ngay trong HTML (trang
 *     này render trên server), và nhét cả bài vào JSON-LD là nhân đôi dung lượng
 *     trang để không được gì.
 *
 * `author` là `Person` với đúng cái tên đã chụp lại lúc viết. Không kèm email,
 * không kèm link — người thuê không đăng ký làm tác giả công khai trên internet.
 */
export function blogPostingJsonLd(post: {
  slug: string;
  title: string;
  description: string;
  authorName: string;
  publishedAt: string | null;
  updatedAt: string;
  imageUrl: string | null;
}): Record<string, unknown> {
  const url = absoluteUrl(`/blog/${post.slug}`);
  const modified =
    post.publishedAt && post.updatedAt.slice(0, 10) !== post.publishedAt.slice(0, 10)
      ? post.updatedAt
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#post`,
    mainEntityOfPage: url,
    url,
    headline: post.title,
    description: post.description,
    inLanguage: "vi-VN",
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@id": BUSINESS_ID },
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(modified ? { dateModified: modified } : {}),
    ...(post.imageUrl ? { image: [post.imageUrl] } : {}),
  };
}

/** Mô tả cho thẻ meta: cắt ở ranh giới từ, không cắt giữa chữ. */
export function clampDescription(text: string, max = 155) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).replace(/[,.;:–-]$/, "")}…`;
}
