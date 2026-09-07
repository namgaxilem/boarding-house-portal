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

  /**
   * Tên hiện DƯỚI ICON khi cài app lên màn hình chính điện thoại.
   * Android cắt sau ~12 ký tự, iOS sau ~11 — dài hơn sẽ thành "Nhà trọ Tâ…".
   */
  shortName: "Tân Phát",

  /**
   * Múi giờ dùng để HIỂN THỊ mọi mốc thời gian.
   *
   * Cố định theo nhà trọ, không theo máy chủ. Vercel, Cloudflare và phần lớn
   * container chạy UTC — thiếu chỗ này thì hoá đơn phát hành 09:00 hiện thành
   * 02:00 và phiếu báo hỏng gửi tối nay hiện thành chiều nay. Local không thấy
   * vì máy ở Việt Nam vốn đã UTC+7.
   *
   * Đổi chỉ khi nhà trọ thật sự ở múi giờ khác. Đây là tên IANA, không phải
   * "+07:00" — tên IANA mới mang theo lịch sử đổi giờ.
   */
  timeZone: "Asia/Ho_Chi_Minh",

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
    ownerName: "Nguyễn Đức Nam",
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
    accountHolder: "NGUYEN DUC NAM",
    /** Cú pháp chuyển khoản gợi ý cho người thuê. */
    transferNote: "[Mã phòng] [Tháng] - VD: 1 09/2026",
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

  /**
   * Khoá cổng thông minh TTLock. Số ở đây đổi được mà không phải migrate.
   *
   * Bí mật (clientId, clientSecret, tài khoản TTLock) nằm ở `.env.local`, KHÔNG
   * ở đây — file này đi vào bundle gửi xuống trình duyệt.
   */
  gate: {
    /** Số chữ số của mã tự sinh. TTLock nhận 4–9; 6 là mức người ta nhớ được. */
    pinLength: 6,
    /**
     * Mã cấp ra sống bao nhiêu ngày. KHÔNG phải hạn hợp đồng — là cửa sổ trượt,
     * cron đẩy ra xa dần khi hợp đồng còn hiệu lực.
     *
     * 60 ngày là CỐ Ý rộng. Bị khoá ngoài lúc nửa đêm tệ hơn hẳn một mã cũ còn
     * sống thêm vài tuần, nên biên an toàn nghiêng hẳn về phía không nhốt nhầm
     * người: gateway rút phích một tuần, đổi router, chủ trọ đi vắng — không cái
     * nào được phép làm người thuê đứng ngoài cổng.
     */
    pinWindowDays: 60,
    /** Còn dưới bấy nhiêu ngày thì cron gia hạn. Mỗi mã bị đụng ~1 lần/tháng. */
    pinRenewBeforeDays: 30,
    /**
     * Đệm thêm sau `tenancies.expected_end_date`.
     *
     * Hợp đồng hết hạn hôm nay mà mã chết đúng nửa đêm hôm nay là nhốt người ta
     * ngoài cổng vào đúng cái đêm hai bên còn đang thương lượng gia hạn.
     */
    graceDays: 14,
    /** Dưới mức này thì báo chủ trọ, tối đa 7 ngày một lần. */
    lowBatteryPercent: 25,
    /** Kéo lùi con trỏ nhật ký bấy nhiêu giờ mỗi lần, phòng lệch đồng hồ ổ khoá. */
    recordOverlapHours: 6,
    /** Lần đồng bộ đầu tiên kéo về bao nhiêu ngày. Không kéo cả năm. */
    recordFirstRunDays: 7,
    /** Thử ngần này lần không xong thì chuyển 'failed' và gọi người xem. */
    maxSyncAttempts: 5,
    /**
     * Tiền tố tên mã đặt trên ổ khoá: 'NT-1-3f9a2c1b'.
     *
     * Đây là thứ phân biệt mã DO APP CẤP với mã chủ trọ tự bấm trong app TTLock.
     * App không bao giờ xoá mã không mang tiền tố này. ĐỔI TIỀN TỐ SAU KHI ĐÃ CẤP
     * MÃ = app mất dấu toàn bộ mã cũ và coi chúng là mã người ngoài.
     */
    passcodeNamePrefix: "NT",
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
   *
   * KHÔNG có `chat` — đã bỏ khỏi kế hoạch. Nhà trọ 10 phòng đã có Zalo và số điện
   * thoại chủ trọ; một hộp chat trong app chỉ thêm một nơi nữa phải kiểm tra tin
   * nhắn, và tin nhắn nào cần trả lời gấp thì người ta vẫn gọi điện.
   *
   * GHI CHÉP mã cổng / vân tay KHÔNG phải cờ ở đây: nó không phải tính năng cho
   * người thuê mà là sổ tay nội bộ, nằm ở /admin/tenants/<id> và chỉ chủ trọ xem
   * được (bảng `gate_credentials`, RLS chỉ mở cho admin). Luôn bật.
   *
   * `smartGate` thì khác: nó bật/tắt phần NÓI CHUYỆN VỚI THIẾT BỊ.
   */
  features: {
    publicLanding: true,
    publicRoomList: true,
    /**
     * Khoá cổng thông minh TTLock. Bật thì hiện mục "Cổng" trên thanh quản trị.
     *
     * Hai công tắc, cố ý:
     *   - cờ này  = có hiện giao diện không
     *   - TTLOCK_* trong .env.local = có gọi được API không
     *
     * Bật cờ mà chưa điền env thì /admin/gate hiện danh sách việc cần làm để cài
     * đặt, không báo lỗi. Đó chính là trạng thái hữu ích trong 1–2 tuần chờ
     * TTLock duyệt tài khoản nhà phát triển.
     */
    smartGate: true,
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
