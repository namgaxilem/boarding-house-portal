import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * So sánh hai chuỗi bí mật trong thời gian không đổi.
 *
 * Tách ra khỏi `lib/cron-auth.ts` khi webhook Telegram cần đúng phép so này:
 * hai chỗ dùng chung một hàm, vì viết hai lần rồi để một bên quên là cách lỗi
 * phân quyền vẫn hay xảy ra nhất.
 *
 * `a !== b` của JavaScript dừng ngay ở byte đầu tiên khác nhau, nên thời gian
 * chạy rò rỉ số ký tự đầu đã đoán đúng. Qua mạng thì độ nhiễu lớn hơn chênh lệch
 * đó rất nhiều, nên đây không phải lỗ hổng đang bị khai thác — nhưng cách viết
 * đúng cũng chỉ tốn đúng chừng này dòng.
 *
 * Băm cả hai về cùng độ dài trước khi so: `timingSafeEqual` ném lỗi khi hai
 * buffer khác độ dài, và bản thân việc ném lỗi đó đã để lộ độ dài bí mật.
 */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    // Vẫn chạy một phép so cùng độ dài để thời gian không phụ thuộc độ dài.
    timingSafeEqual(left, left);
    return false;
  }

  return timingSafeEqual(left, right);
}
