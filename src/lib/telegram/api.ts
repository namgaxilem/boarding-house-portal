import "server-only";

import { getTelegramBotToken, isTelegramConfigured } from "@/lib/env";
import type { InlineKeyboard } from "./types";

/**
 * Gọi Bot API của Telegram bằng `fetch` trần.
 *
 * KHÔNG dùng `grammy` / `telegraf`, và vì đúng lập luận `lib/email.ts` đã viết
 * cho Resend: đây là sáu lời POST tới một host với một thân JSON. Hai thư viện
 * đó mang theo runtime middleware/session/router riêng, sẽ cạnh tranh với chính
 * việc định tuyến của Next và tạo ra chỗ THỨ HAI quyết định "người này là ai".
 *
 * Mọi hàm ở đây **không bao giờ throw** — trả `boolean` hoặc `null` và ghi log
 * `[telegram]`. Bot im lặng vì Telegram chậm thì tệ; một `after()` chết giữa
 * chừng vì một lần `sendMessage` hỏng thì tệ hơn, vì khi đó thao tác đã chạy
 * xong rồi mà chủ trọ không biết.
 */

const TIMEOUT_MS = 10_000;

/** Telegram cắt tin nhắn ở 4096 ký tự và trả lỗi nếu vượt. Cắt sẵn cho gọn. */
const MAX_MESSAGE_LENGTH = 4096;

async function call<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  if (!isTelegramConfigured()) return null;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${getTelegramBotToken()}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };

    if (!response.ok || !payload.ok) {
      console.error(`[telegram] ${method} lỗi`, response.status, payload.description);
      return null;
    }

    return payload.result ?? null;
  } catch (error) {
    console.error(`[telegram] ${method} không gọi được`, error);
    return null;
  }
}

function clamp(text: string) {
  if (text.length <= MAX_MESSAGE_LENGTH) return text;
  return `${text.slice(0, MAX_MESSAGE_LENGTH - 20)}\n\n… (đã cắt bớt)`;
}

export async function sendMessage(
  chatId: number,
  text: string,
  options?: { keyboard?: InlineKeyboard },
): Promise<number | null> {
  const result = await call<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: clamp(text),
    // KHÔNG đặt parse_mode. Nội dung có thể chứa tên phòng, ghi chú của người
    // thuê, hay một dấu `_` bất kỳ — bật Markdown lên là Telegram từ chối cả tin
    // nhắn vì "can't parse entities", và lỗi đó chỉ xuất hiện với đúng những
    // chuỗi ta không kiểm soát.
    disable_web_page_preview: true,
    ...(options?.keyboard ? { reply_markup: options.keyboard } : {}),
  });

  return result?.message_id ?? null;
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
): Promise<boolean> {
  // Gỡ luôn bàn phím: đây là lớp hai chống bấm đúp, lớp thật là câu UPDATE có
  // điều kiện `resolved_at is null` trong database.
  const result = await call<unknown>("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: clamp(text),
    reply_markup: { inline_keyboard: [] },
  });
  return result !== null;
}

/**
 * Phải gọi trong ~10 giây kể từ lúc người dùng bấm nút, nếu không client của
 * họ quay vòng mãi. Nên: trả toast ngay, làm việc trong `after()`.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<boolean> {
  const result = await call<unknown>("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
  return result !== null;
}

/** "Đang nhập…" — Telegram hiện 5 giây, gửi lại giữa các lần gọi tool. */
export async function sendChatAction(chatId: number): Promise<void> {
  await call<unknown>("sendChatAction", { chat_id: chatId, action: "typing" });
}
