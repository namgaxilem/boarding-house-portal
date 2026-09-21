import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { safeEqual } from "@/lib/safe-equal";

/**
 * Xác thực webhook Telegram.
 *
 * `setWebhook` nhận tham số `secret_token`; từ đó Telegram gắn header
 * `X-Telegram-Bot-Api-Secret-Token` vào MỌI lần gọi. So sánh cả header với cả
 * secret, thời-gian-không-đổi — cùng hình dạng `authorizeCron`, và dùng chung
 * `safeEqual` với nó.
 *
 * Thiếu biến thì ĐÓNG (503), không mở mặc định. Đây là điểm khác quan trọng so
 * với TTLock hay Resend: thiếu khoá email thì app mất một tính năng, còn một
 * webhook admin không xác thực **là** một bảng điều khiển admin mở toang.
 *
 * Secret hợp lệ theo Telegram: 1–256 ký tự, chỉ `A-Z a-z 0-9 _ -`.
 * Sinh bằng `openssl rand -hex 32`.
 */
export function verifyTelegramWebhook(request: NextRequest): NextResponse | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return NextResponse.json(
      { error: "TELEGRAM_WEBHOOK_SECRET chưa được cấu hình" },
      { status: 503 },
    );
  }

  const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(header, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
