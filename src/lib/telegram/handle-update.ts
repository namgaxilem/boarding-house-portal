import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { runAgent } from "@/lib/agent/run";
import { telegramContext } from "@/lib/mcp/context";
import { READ_TOOLS } from "@/lib/mcp/registry";
import { env, isAgentConfigured } from "@/lib/env";
import { houseConfig } from "@/config/site";

import { sendChatAction, sendMessage } from "./api";
import { redeemLinkCode, resolveTelegramAdmin } from "./identity";
import type { TelegramUpdate } from "./types";

/**
 * Thân của `after()` — chạy SAU khi webhook đã trả 200.
 *
 * Không bao giờ throw: một ngoại lệ thoát ra khỏi đây sẽ chết lặng trong
 * `after()` và chủ trọ chỉ thấy bot im lặng. Mọi nhánh đều kết thúc bằng một
 * `sendMessage`.
 */
export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.message) await handleMessage(update.message);
    // `callback_query` (nút xác nhận) thuộc đợt ghi. Chưa có tool ghi nào nên
    // chưa có nút nào để bấm — bỏ qua thay vì trả lời một câu khó hiểu.
  } catch (error) {
    console.error("[telegram] xử lý update thất bại", error);
    const chatId = update.message?.chat.id;
    if (chatId) {
      await sendMessage(chatId, "Có lỗi khi xử lý tin nhắn. Thử lại sau.");
    }
  }
}

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
  const chatId = message.chat.id;
  const raw = (message.text ?? "").trim();
  if (!raw) return;

  const username = message.from?.username ?? message.chat.username ?? null;

  // /start là lệnh DUY NHẤT người chưa liên kết gọi được. Mọi thứ khác đòi một
  // liên kết còn hiệu lực trỏ tới một tài khoản chủ trọ đang hoạt động.
  if (raw.startsWith("/start")) {
    await handleStart(chatId, raw, username);
    return;
  }

  const actor = await resolveTelegramAdmin(chatId);
  if (!actor) {
    await sendMessage(
      chatId,
      "Máy này chưa được liên kết với tài khoản chủ trọ.\n\n" +
        "Mở trang quản trị → Cài đặt → Trợ lý, bấm “Tạo mã liên kết”, rồi gõ:\n" +
        "/start MÃ-CỦA-BẠN",
    );
    return;
  }

  await db.touchTelegramLink(chatId);

  if (raw === "/help" || raw === "/trogiup") {
    await sendMessage(chatId, helpText());
    return;
  }

  if (raw.startsWith("/")) {
    await sendMessage(chatId, `Không có lệnh “${raw.split(" ")[0]}”. Gõ /help để xem.`);
    return;
  }

  if (!isAgentConfigured()) {
    await sendMessage(
      chatId,
      "Trợ lý chưa được cấu hình nên chưa trả lời câu hỏi tự do được.\n" +
        "Liên kết tài khoản thì vẫn chạy bình thường.",
    );
    return;
  }

  // Telegram hiện "đang nhập…" trong 5 giây. Một lượt agent thường lâu hơn thế,
  // nên gửi luôn một dòng thật để chủ trọ biết bot đã nhận.
  await sendChatAction(chatId);

  const ctx = telegramContext(actor.profile, chatId, randomUUID());
  const reply = await runAgent(raw, ctx);

  await sendMessage(chatId, reply.text);
}

async function handleStart(chatId: number, raw: string, username: string | null) {
  const code = raw.slice("/start".length).trim();

  if (!code) {
    const existing = await resolveTelegramAdmin(chatId);
    if (existing) {
      await sendMessage(
        chatId,
        `Máy này đã liên kết với ${existing.profile.email}.\n\nGõ /help để xem hỏi được gì.`,
      );
      return;
    }

    await sendMessage(
      chatId,
      `Trợ lý của ${houseConfig.name}.\n\n` +
        "Chỉ chủ trọ dùng được. Mở trang quản trị → Cài đặt → Trợ lý, bấm " +
        "“Tạo mã liên kết”, rồi gõ lại:\n/start MÃ-CỦA-BẠN",
    );
    return;
  }

  const result = await redeemLinkCode(chatId, code, username);

  if (!result.ok) {
    await sendMessage(chatId, linkErrorMessage(result.reason));
    return;
  }

  const actor = await resolveTelegramAdmin(chatId);
  await sendMessage(
    chatId,
    `Đã liên kết với tài khoản ${actor?.profile.email ?? "chủ trọ"}.\n\n` +
      "Gõ /help để xem hỏi được gì.",
  );
}

function linkErrorMessage(reason: string): string {
  switch (reason) {
    case "TELEGRAM_CODE_INVALID":
      return "Mã không đúng. Kiểm tra lại, hoặc tạo mã mới ở trang quản trị.";
    case "TELEGRAM_CODE_USED":
      return "Mã này đã dùng rồi. Mỗi mã chỉ liên kết được một lần — tạo mã mới.";
    case "TELEGRAM_CODE_EXPIRED":
      return "Mã đã hết hạn (mã sống 10 phút). Tạo mã mới rồi gõ lại ngay.";
    case "TELEGRAM_NOT_ADMIN":
      return "Tài khoản gắn với mã này không phải chủ trọ, hoặc đã bị khoá.";
    case "TELEGRAM_TOO_MANY_ATTEMPTS":
      return "Nhập sai quá nhiều lần. Chờ một tiếng rồi thử lại.";
    default:
      return "Không liên kết được. Thử lại sau.";
  }
}

function helpText(): string {
  return [
    `Trợ lý của ${houseConfig.name}. Hỏi bằng tiếng Việt bình thường, ví dụ:`,
    "",
    "• còn phòng nào trống không",
    "• ai còn nợ tiền",
    "• phòng 201 tháng này dùng bao nhiêu điện",
    "• có báo hỏng nào chưa xử lý không",
    "• doanh thu từ tháng 6 tới giờ",
    "",
    `Hiện có ${READ_TOOLS.length} nguồn dữ liệu, tất cả CHỈ ĐỌC — trợ lý không sửa được gì.`,
    "Việc cần thay đổi dữ liệu thì mở trang quản trị:",
    env.siteUrl,
    "",
    "Trợ lý KHÔNG đọc được: ảnh và số CCCD, mã cổng, mật khẩu wifi.",
  ].join("\n");
}
