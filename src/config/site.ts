/**
 * ============================================================================
 *  CẤU HÌNH NHÀ TRỌ — SỬA MỌI THỨ Ở ĐÂY
 * ============================================================================
 *
 * Đây là NGUỒN SỰ THẬT DUY NHẤT cho thông tin nhà trọ: tên, địa chỉ, liên hệ,
 * số tài khoản, nội quy, đơn giá mặc định. Không có bảng `settings` trong
 * database — cố ý, để không bao giờ có chuyện 2 nơi ghi 2 giá trị khác nhau.
 *
 * Đổi thông tin ở đây rồi deploy lại là xong. Trang /admin/settings chỉ hiển thị
 * lại nội dung file này (chỉ đọc) để đối chiếu với những gì người thuê nhìn thấy.
 *
 * Dữ liệu ĐỘNG (phòng, người thuê, hợp đồng, wifi) nằm ở database, không ở đây.
 */

export const houseConfig = {
  /** Tên hiển thị trên mọi trang, tab trình duyệt, và trang giới thiệu. */
  name: "Nhà trọ Tân Phát",

  /** Mô tả ngắn cho trang chủ và thẻ chia sẻ mạng xã hội. */
  tagline: "Phòng trọ sạch sẽ, an ninh, gần trung tâm",
  description:
    "Nhà trọ 10 phòng khép kín, giờ giấc tự do, có chỗ để xe, wifi tốc độ cao. Quản lý trực tiếp bởi chủ nhà.",

  /** Địa chỉ đầy đủ. */
  address: {
    street: "123 Đường Cầu Giấy",
    ward: "Phường Dịch Vọng",
    district: "Quận Cầu Giấy",
    city: "Hà Nội",
    /** Link Google Maps. Để rỗng thì trang liên hệ ẩn nút chỉ đường. */
    mapUrl: "https://maps.google.com/?q=123+Cau+Giay+Ha+Noi",
  },

  /** Thông tin liên hệ chủ trọ. */
  contact: {
    ownerName: "Nguyễn Văn Tâm",
    phone: "0901234567",
    zalo: "0901234567",
    email: "nhatrotanphat@gmail.com",
    /** Số gọi khi có sự cố khẩn cấp (cháy, rò điện, ngập). */
    emergencyPhone: "0908888888",
    /** Giờ chủ trọ tiếp nhận liên hệ, hiển thị ở trang liên hệ. */
    officeHours: "07:00 – 21:00 hàng ngày",
  },

  /** Tài khoản nhận tiền phòng. Để `null` nếu chỉ thu tiền mặt. */
  bank: {
    name: "Vietcombank",
    accountNumber: "0011001234567",
    accountHolder: "NGUYEN VAN TAM",
    /** Cú pháp chuyển khoản gợi ý cho người thuê. */
    transferNote: "[Mã phòng] [Tháng] - VD: P101 08/2026",
  } as {
    name: string;
    accountNumber: string;
    accountHolder: string;
    transferNote: string;
  } | null,

  /** Nội quy hiển thị cho người thuê tại /me/rules. */
  rules: [
    "Giữ yên lặng sau 22h30, không mở nhạc lớn.",
    "Đóng tiền phòng trước ngày 05 hàng tháng.",
    "Không nấu ăn ngoài hành lang, không để xe chắn lối đi.",
    "Khách ở lại qua đêm phải báo trước với chủ trọ.",
    "Rác bỏ đúng nơi quy định, đổ trước 19h mỗi ngày.",
    "Tự bảo quản tài sản cá nhân, khóa cửa khi ra ngoài.",
    "Không nuôi thú cưng trong phòng.",
    "Báo ngay cho chủ trọ khi có hỏng hóc điện nước.",
  ],

  /**
   * Đơn giá mặc định khi thêm phòng mới. Từng phòng vẫn sửa được riêng.
   * Đơn vị: đồng.
   */
  defaults: {
    electricPrice: 3800, // mỗi kWh
    waterPrice: 25000, // mỗi m³
    servicePrice: 100000, // rác + gửi xe + internet, mỗi tháng
    maxOccupants: 2,
  },

  /** Tiện ích hiển thị ở trang giới thiệu công khai. */
  amenities: [
    "Phòng khép kín, có gác lửng",
    "Wifi tốc độ cao miễn phí",
    "Chỗ để xe máy có mái che",
    "Camera an ninh 24/7",
    "Giờ giấc tự do, không chung chủ",
    "Gần chợ, trường học, bến xe buýt",
  ],

  /**
   * Bật/tắt tính năng. Đặt `false` để ẩn hoàn toàn khỏi giao diện.
   * `chat`, `gateCodes`, `invoices` chưa cài — để sẵn cho Phase sau.
   */
  features: {
    publicLanding: true,
    publicRoomList: true,
    chat: false,
    gateCodes: false,
    invoices: false,
  },

  /**
   * Nút đăng nhập mạng xã hội hiện trên trang /login.
   *
   * Bật lên CHỈ sau khi đã điền app id/secret — bật mà chưa có thì người dùng
   * bấm vào sẽ gặp lỗi khó hiểu. Xem README mục 4 để biết điền ở đâu.
   *
   * ⚠️ App KHÔNG cho tự đăng ký. Đăng nhập mạng xã hội chỉ dùng để vào một tài
   * khoản chủ trọ ĐÃ TẠO SẴN:
   *   - Google / Facebook: khớp theo email. Email chủ trọ nhập lúc tạo tài khoản
   *     phải trùng đúng email của tài khoản mạng xã hội đó.
   *   - Zalo: khớp theo số điện thoại (lần đầu), sau đó nhớ theo Zalo ID.
   */
  login: {
    google: true,
    facebook: true,
    zalo: true,
  },
} as const;

export type HouseConfig = typeof houseConfig;

/** "123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội" */
export function fullAddress() {
  const { street, ward, district, city } = houseConfig.address;
  return [street, ward, district, city].filter(Boolean).join(", ");
}

/** tel: link — Intl phone formatting would break the dialer, so keep digits raw. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}

export function zaloHref(phone: string) {
  return `https://zalo.me/${phone.replace(/\D/g, "")}`;
}
