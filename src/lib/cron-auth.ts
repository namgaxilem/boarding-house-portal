import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { safeEqual } from "@/lib/safe-equal";

/**
 * Kiểm quyền cho hai endpoint cron (`/api/cron/*`).
 *
 * Hai chỗ dùng chung một hàm, vì viết hai lần rồi để một bên quên là cách lỗi
 * phân quyền vẫn hay xảy ra nhất. Phép so thời-gian-không-đổi đã chuyển sang
 * `lib/safe-equal.ts` khi webhook Telegram cần đúng nó — cùng một lý do.
 */

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
