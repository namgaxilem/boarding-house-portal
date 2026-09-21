/**
 * Sinh đường dẫn cho bài viết: "Điện nước tháng 10" → "dien-nuoc-thang-10".
 *
 * Đặt ở `lib/` chứ không ở `features/posts/` vì đây là logic thuần, và
 * `vitest.config.ts` chỉ chạy `src/lib/**\/*.test.ts` — để chỗ khác là không có
 * test, mà đây đúng là loại hàm sai một chỗ thì hỏng vĩnh viễn: slug đã đăng
 * nằm trong chỉ mục Google và trong tin nhắn người ta đã gửi nhau.
 */

/** Giới hạn mềm. DB cho tối đa 80 ký tự; chừa chỗ cho hậu tố chống trùng. */
const MAX_LENGTH = 60;

/** Slug tối thiểu 3 ký tự (ràng buộc `posts_slug_format`). Ngắn hơn thì thay hẳn. */
const MIN_LENGTH = 3;

const FALLBACK = "bai-viet";

export function slugify(input: string): string {
  const stripped = input
    // Tách dấu ra khỏi chữ rồi bỏ dấu: "ế" (U+1EBF) và "ê"+U+0301 cho cùng kết quả.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // đ/Đ PHẢI xử lý riêng. U+0111 và U+0110 KHÔNG có canonical decomposition, nên
    // NFD không đụng tới chúng — bỏ dòng này thì "Điện nước" ra "in-nc", và lỗi đó
    // vô hình lúc đọc code, vĩnh viễn khi URL đã phát ra ngoài.
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (stripped.length <= MAX_LENGTH) {
    return stripped.length >= MIN_LENGTH ? stripped : FALLBACK;
  }

  // Cắt tại dấu nối, không cắt giữa từ: ".../dien-nuoc-thang-mu" đọc như lỗi đánh
  // máy. Cùng kỹ thuật với clampDescription() trong lib/structured-data.ts.
  const head = stripped.slice(0, MAX_LENGTH);
  const lastDash = head.lastIndexOf("-");
  const cut = lastDash >= MIN_LENGTH ? head.slice(0, lastDash) : head;

  return cut.length >= MIN_LENGTH ? cut : FALLBACK;
}

/**
 * Thêm hậu tố cho tới khi không đụng slug nào đang có.
 *
 * Đánh số chứ không random: người dùng xoá bản nháp rồi tạo lại cùng tiêu đề thì
 * phải nhận về đúng URL cũ. Chỉ khi đã kẹt tới 99 mới rơi sang chuỗi ngẫu nhiên —
 * mốc đó thực tế không tới, nhưng vòng lặp thì phải có điểm dừng.
 *
 * Đây CHỈ là lớp cho đẹp. Chốt chặn thật là unique index `posts_slug_key`: hai
 * người gửi cùng tiêu đề trong cùng một giây thì lần kiểm này thua cuộc đua, và
 * adapter dịch mã 23505 thành DUPLICATE_POST_SLUG.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;

  for (let n = 2; n <= 99; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }

  let candidate = "";
  do {
    candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
  } while (used.has(candidate));
  return candidate;
}
