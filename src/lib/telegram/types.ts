import { z } from "zod";

/**
 * Chỉ phần `Update` mà app thực sự xử lý.
 *
 * Telegram gửi hàng chục loại update; `setWebhook` khai `allowed_updates` để
 * chặn phần lớn ngay từ đầu, và schema này là lớp thứ hai — một payload lạ bị
 * từ chối ở đây chứ không đi tiếp vào vòng lặp agent với hình dạng không đoán
 * được.
 *
 * `.passthrough()` ở `update`: Telegram thêm trường mới theo thời gian, và một
 * trường lạ không phải lý do để bỏ nguyên tin nhắn.
 */

const chat = z.object({
  id: z.number(),
  username: z.string().optional(),
});

const from = z.object({
  id: z.number(),
  username: z.string().optional(),
  first_name: z.string().optional(),
});

export const telegramMessageSchema = z.object({
  message_id: z.number(),
  chat,
  from: from.optional(),
  text: z.string().optional(),
});

export const telegramCallbackQuerySchema = z.object({
  id: z.string(),
  from,
  data: z.string().optional(),
  message: telegramMessageSchema.optional(),
});

export const telegramUpdateSchema = z
  .object({
    update_id: z.number(),
    message: telegramMessageSchema.optional(),
    callback_query: telegramCallbackQuerySchema.optional(),
  })
  .loose();

export type TelegramMessage = z.infer<typeof telegramMessageSchema>;
export type TelegramCallbackQuery = z.infer<typeof telegramCallbackQuerySchema>;
export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

/** Bàn phím gắn dưới một tin nhắn. `callback_data` trần 64 BYTE — xem api.ts. */
export interface InlineKeyboard {
  inline_keyboard: { text: string; callback_data: string }[][];
}
