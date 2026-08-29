import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Kiểm quyền cho hai endpoint cron (`/api/cron/*`).
 *
 * Hai chỗ dùng chung một hàm, vì viết hai lần rồi để một bên quên là cách lỗi
 * phân quyền vẫn hay xảy ra nhất.
 */

/**
 * So sánh trong thời gian không đổi.
 *
 * `a !== b` của JavaScript dừng ngay ở byte đầu tiên khác nhau, nên thời gian
 * chạy rò rỉ số ký tự đầu đã đoán đúng. Qua mạng thì độ nhiễu lớn hơn chênh lệch
 * đó rất nhiều, nên đây không phải lỗ hổng đang bị khai thác — nhưng cách viết
 * đúng cũng chỉ tốn đúng chừng này dòng.
 *
 * Băm cả hai về cùng độ dài trước khi so: `timingSafeEqual` ném lỗi khi hai
 * buffer khác độ dài, và bản thân việc ném lỗi đó đã để lộ độ dài bí mật.
 */
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    // Vẫn chạy một phép so cùng độ dài để thời gian không phụ thuộc độ dài.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * Trả về `null` khi hợp lệ, hoặc response lỗi để route trả thẳng ra.
 *
 * Thiếu `CRON_SECRET` thì endpoint ĐÓNG (503), không mở mặc định.
 */
export function authorizeCron(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET chưa được cấu hình" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  if (!safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
