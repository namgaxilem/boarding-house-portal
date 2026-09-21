/**
 * Hạn mức cho MỌI luồng tải ảnh lên.
 *
 * Dự án chạy trên gói miễn phí của Supabase: 1GB Storage và 5GB băng thông mỗi
 * tháng. Con số đó nghe nhiều, nhưng một tấm ảnh điện thoại chưa nén là 3–6MB —
 * chỉ cần vài trăm tấm lọt qua là hết chỗ. Nên mọi giới hạn được gom về một
 * file duy nhất, và CẢ trình duyệt LẪN server đều đọc chính file này.
 *
 * Trước đây mỗi luồng tự khai `MAX_BYTES` riêng trong action của nó, còn trình
 * duyệt khai lại lần nữa trong component. Ba nơi, ba con số, không có gì buộc
 * chúng khớp nhau.
 *
 * KHÔNG import "server-only" ở đây: component client cũng cần đọc.
 */

export interface UploadPolicy {
  /** Dùng cho `<input accept>` và kiểm lại lần nữa ở server. */
  acceptedTypes: readonly string[];

  /**
   * Từ chối TRƯỚC khi giải nén. `createImageBitmap` nạp toàn bộ ảnh vào RAM
   * dưới dạng bitmap thô: một tấm 50MP ăn ~200MB và làm sập tab trên điện
   * thoại. Người dùng chỉ thấy app "hỏng", không thấy lý do.
   */
  maxInputBytes: number;

  /** Cạnh dài nhất sau khi thu nhỏ. */
  maxDimension: number;

  /** Chất lượng khởi điểm khi mã hoá (0–1). */
  quality: number;

  /**
   * Đích cần chạm sau khi nén. Encoder hạ dần chất lượng rồi hạ kích thước cho
   * tới khi xuống dưới mức này — xem `encodeLadder` trong lib/image.ts.
   */
  targetBytes: number;

  /**
   * Chốt chặn phía server, và cũng là `file_size_limit` của bucket.
   * Để rộng gấp ~3 lần `targetBytes` phòng trường hợp ảnh quá nhiễu không nén
   * xuống được, chứ không phải mức bình thường.
   */
  maxUploadBytes: number;

  /** Số ảnh tối đa trong MỘT lần gửi. */
  maxPerUpload: number;

  /** Tổng số ảnh tối đa mà một phòng / một phiếu / một tài khoản được giữ. */
  maxPerParent: number;
}

/** jpeg/png/webp. HEIC không có ở đây: canvas không giải mã được nó. */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** 25MB. Trên mức này thì gần như chắc chắn là ảnh RAW hoặc file không phải ảnh. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/**
 * Ảnh phòng: hiện trên trang giới thiệu công khai, xem trên điện thoại là
 * chính. 1600px là đủ cho màn hình 2x mà không phải trả giá gấp bốn.
 */
export const ROOM_PHOTO_POLICY: UploadPolicy = {
  acceptedTypes: IMAGE_TYPES,
  maxInputBytes: MAX_INPUT_BYTES,
  maxDimension: 1600,
  quality: 0.82,
  targetBytes: 400 * 1024,
  maxUploadBytes: 1536 * 1024,
  maxPerUpload: 10,
  maxPerParent: 12,
};

/**
 * Ảnh CCCD: phải ĐỌC được số trên đó, nên chất lượng nhích cao hơn ảnh phòng.
 * Bù lại chỉ có đúng hai tấm mỗi người (mặt trước, mặt sau).
 */
export const ID_PHOTO_POLICY: UploadPolicy = {
  acceptedTypes: IMAGE_TYPES,
  maxInputBytes: MAX_INPUT_BYTES,
  maxDimension: 1600,
  quality: 0.86,
  targetBytes: 500 * 1024,
  maxUploadBytes: 1536 * 1024,
  maxPerUpload: 2,
  maxPerParent: 2,
};

/**
 * Ảnh QR chuyển khoản: MÁY phải quét được, nên khác hẳn hai loại trên.
 *
 * QR sống bằng cạnh sắc giữa ô đen và ô trắng. Nén mạnh làm nhoè cạnh và máy
 * quét đọc sai — nên chất lượng để rất cao (0.92) và bù lại bằng kích thước
 * nhỏ (1000px thừa sức cho một mã QR, vốn thường chỉ 300–600px).
 *
 * Trước đây ảnh dưới 1MB được tải lên NGUYÊN BẢN, không nén. Một ảnh chụp màn
 * hình PNG 900KB vì thế nằm lại trong bucket ở dạng 900KB, trong khi cùng nội
 * dung đó ở WebP chỉ ~40KB.
 */
export const PAYMENT_QR_POLICY: UploadPolicy = {
  acceptedTypes: IMAGE_TYPES,
  maxInputBytes: MAX_INPUT_BYTES,
  maxDimension: 1000,
  quality: 0.92,
  targetBytes: 250 * 1024,
  maxUploadBytes: 1024 * 1024,
  maxPerUpload: 1,
  maxPerParent: 1,
};

/** Ảnh báo hỏng: chỉ để chủ trọ nhìn ra hỏng chỗ nào, không cần nét. */
export const MAINTENANCE_PHOTO_POLICY: UploadPolicy = {
  acceptedTypes: IMAGE_TYPES,
  maxInputBytes: MAX_INPUT_BYTES,
  maxDimension: 1600,
  quality: 0.82,
  targetBytes: 400 * 1024,
  maxUploadBytes: 1536 * 1024,
  maxPerUpload: 5,
  maxPerParent: 6,
};

/**
 * Ảnh trong bài viết.
 *
 * 1280px, không phải 1600 như ảnh phòng: cột chữ của trang blog rộng tối đa
 * ~768px CSS, nên 1280 đã dư cho màn hình 1.5x. Mỗi bài tối đa 4 ảnh (bìa + 3) —
 * ảnh báo hỏng được 6 vì một phiếu sửa chữa cần nhiều góc, một bài viết thì không.
 *
 * ⚠️ Đổi số ở đây thì sửa cả `post_images_enforce_quota()` trong
 * `supabase/migrations/20260920000013_posts.sql` — trần 4 ảnh và 1.5MB mỗi bài
 * được ép ở đó, và đó mới là chốt chặn thật.
 */
export const POST_IMAGE_POLICY: UploadPolicy = {
  acceptedTypes: IMAGE_TYPES,
  maxInputBytes: MAX_INPUT_BYTES,
  maxDimension: 1280,
  quality: 0.8,
  targetBytes: 250 * 1024,
  maxUploadBytes: 900 * 1024,
  maxPerUpload: 4,
  maxPerParent: 4,
};

/** Cho `<input accept="...">`. */
export function acceptAttribute(policy: UploadPolicy) {
  return policy.acceptedTypes.join(",");
}

/**
 * Kiểm tra một file trước khi tải lên. Dùng chung cho server action (chốt chặn
 * thật) và trình duyệt (báo lỗi sớm, đỡ tốn một vòng mạng).
 *
 * Trả về câu tiếng Việt để hiện thẳng cho người dùng, hoặc `null` nếu hợp lệ.
 */
export function checkUploadFile(
  file: File,
  policy: UploadPolicy,
  label = file.name,
): string | null {
  if (!policy.acceptedTypes.includes(file.type)) {
    return `"${label}" không phải ảnh JPG, PNG hoặc WebP.`;
  }
  if (file.size > policy.maxUploadBytes) {
    return `"${label}" vẫn quá nặng sau khi nén (${formatBytes(file.size)}, tối đa ${formatBytes(policy.maxUploadBytes)}).`;
  }
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
