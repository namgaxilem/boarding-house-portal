import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import type { TelegramActor } from "@/types";

/**
 * Biến một `chat_id` thành một chủ trọ đã chứng minh danh tính.
 *
 * `chat_id` một mình KHÔNG BAO GIỜ đủ, vì ba lý do:
 *
 *   1. Webhook là endpoint HTTPS công khai. Rò `TELEGRAM_WEBHOOK_SECRET` ra thì
 *      một `Update` giả với `chat_id` bất kỳ là POST được — và khi đó một
 *      allowlist trần biến một số nguyên đoán được thành thứ duy nhất chắn cửa.
 *   2. `chat_id` định danh một CUỘC TRÒ CHUYỆN, không định danh một NGƯỜI. Nhật
 *      ký cần `profiles.id`, và việc kiểm vai cũng vậy.
 *   3. Không có hạn, không thu hồi được, không phân biệt được "máy nào".
 *
 * Nên luồng là: chủ trọ đang ĐĂNG NHẬP trên web bấm sinh mã → gõ mã cho bot →
 * bot đổi mã lấy liên kết. Mã sống 10 phút, dùng một lần, lưu dạng băm.
 */

const CODE_TTL_MINUTES = 10;

/**
 * Bảng chữ Crockford base32 — bỏ I, O, U, 0, 1.
 *
 * Mã này được ĐỌC TỪ MÀN HÌNH rồi GÕ LẠI trên điện thoại. `0` và `O` nhìn giống
 * nhau, `1` và `I` cũng vậy, và `U` thì hay tạo ra từ tục ngoài ý muốn.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;

/** ~40 bit. Với hạn 10 phút và trần 5 lần sai mỗi giờ thì không dò được. */
export function generateLinkCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

export function hashLinkCode(code: string): string {
  // Chuẩn hoá trước khi băm: người ta gõ chữ thường, và dán vào thì hay dính
  // khoảng trắng hai đầu.
  return createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

export function linkCodeExpiry(): string {
  return new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
}

/** Sinh mã cho một chủ trọ. Trả về mã THẬT — hiện đúng một lần rồi mất. */
export async function issueLinkCode(profileId: string): Promise<string> {
  const code = generateLinkCode();
  await db.createTelegramLinkCode(profileId, hashLinkCode(code), linkCodeExpiry());
  return code;
}

/** Số lần đổi mã hỏng tối đa cho một chat trong một giờ. */
const MAX_ATTEMPTS_PER_HOUR = 5;

export async function redeemLinkCode(
  chatId: number,
  code: string,
  username: string | null,
): Promise<{ ok: true; profileId: string } | { ok: false; reason: string }> {
  const attempts = await db.countRecentLinkAttempts(chatId);
  if (attempts >= MAX_ATTEMPTS_PER_HOUR) {
    return { ok: false, reason: "TELEGRAM_TOO_MANY_ATTEMPTS" };
  }

  try {
    const profileId = await db.redeemTelegramLinkCode(hashLinkCode(code), chatId, username);
    return { ok: true, profileId };
  } catch (error) {
    // Ghi lần thử HỎNG, không ghi lần thành công: hạn mức là để chống dò mã.
    await db.recordLinkAttempt(chatId);
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message };
  }
}

/**
 * Ai đang nhắn tin, hay `null`.
 *
 * Kiểm vai Ở MỖI TIN NHẮN, không chỉ lúc liên kết — hạ quyền một tài khoản trên
 * web thì bot ngừng nghe người đó ngay ở tin nhắn kế tiếp. Cùng nguyên tắc
 * "database nói lời cuối" của `lib/auth/dal.ts`.
 */
export async function resolveTelegramAdmin(chatId: number): Promise<TelegramActor | null> {
  const found = await db.getTelegramActor(chatId);
  if (!found) return null;

  const { profile } = found;
  if (profile.role !== "admin" || !profile.isActive) return null;

  return {
    chatId,
    profile: {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
    },
  };
}
