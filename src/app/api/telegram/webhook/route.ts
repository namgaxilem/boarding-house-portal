import { after, type NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { handleUpdate } from "@/lib/telegram/handle-update";
import { telegramUpdateSchema } from "@/lib/telegram/types";
import { verifyTelegramWebhook } from "@/lib/telegram/verify";

/**
 * Webhook Telegram. Route handler KHÔNG-PHẢI-GET đầu tiên của repo.
 *
 * Hình dạng bắt buộc, và thứ tự là một phần của nó:
 *
 *   1. Kiểm `X-Telegram-Bot-Api-Secret-Token` (timing-safe). Thiếu biến → 503.
 *   2. Đọc và zod-parse `Update`.
 *   3. CHIẾM `update_id` — trước khi trả 200, không phải trong `after()`.
 *   4. Trả 200 NGAY.
 *   5. Làm việc thật trong `after()`.
 *
 * Vì sao bước 3 phải đứng trước bước 4: Telegram gửi lại cùng một `update_id`
 * cho tới khi nhận 2xx. Nếu chiếm chỗ bên trong `after()` thì một lần gửi lại
 * tới lúc lượt đầu còn đang chạy sẽ được xử lý HAI LẦN.
 *
 * Vì sao bước 5 phải là `after()`: một lượt agent mất 8–40 giây, còn Telegram
 * thì gửi lại nếu không nhận được 2xx sớm. Trả lời trước, làm sau — kiểm chứng
 * bằng `curl -w '%{time_total}'`, phải dưới 0.2 giây kể cả khi câu trả lời tới
 * sau 15 giây.
 *
 * `after()` chạy trong tiến trình và không bền qua một lần restart. Chấp nhận
 * được ở đợt này vì không có thao tác GHI nào: mất một câu trả lời thì chủ trọ
 * thấy ngay và gõ lại. Đợt có tool ghi thì trạng thái bền nằm ở bảng
 * `agent_pending_actions`, không nằm trong vòng lặp.
 */
export async function POST(request: NextRequest) {
  const denied = verifyTelegramWebhook(request);
  if (denied) return denied;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    // 200, không phải 400: Telegram gửi lại mọi thứ không phải 2xx, và một
    // payload hỏng thì gửi lại bao nhiêu lần cũng vẫn hỏng.
    console.error("[telegram] payload không phải JSON");
    return NextResponse.json({ ok: true });
  }

  const parsed = telegramUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("[telegram] update không đúng dạng", parsed.error.issues[0]?.message);
    return NextResponse.json({ ok: true });
  }

  const update = parsed.data;

  const fresh = await db.claimTelegramUpdate(update.update_id);
  if (!fresh) return NextResponse.json({ ok: true, duplicate: true });

  after(() => handleUpdate(update));

  return NextResponse.json({ ok: true });
}
