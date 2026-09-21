"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { describeError, fail, ok, type ActionResult } from "@/lib/action-result";
import { issueLinkCode } from "@/lib/telegram/identity";

/**
 * Sinh mã liên kết, và thu hồi liên kết.
 *
 * Mã hiện ĐÚNG MỘT LẦN trong `ActionResult.data` rồi không lấy lại được —
 * database chỉ giữ băm của nó. Muốn xem lại thì tạo mã mới.
 *
 * Chiều liên kết luôn đi từ WEB sang TELEGRAM, không bao giờ ngược lại: người
 * bấm nút này đang có một phiên đăng nhập đã qua `requireAdmin()`, và đó chính
 * là bằng chứng mà `chat_id` một mình không bao giờ có được.
 */

export async function createLinkCode(): Promise<ActionResult<string>> {
  const admin = await requireAdmin();

  try {
    const code = await issueLinkCode(admin.id);
    revalidatePath("/admin/settings/integrations");
    return ok(code);
  } catch (error) {
    return fail(describeError(error, "Không tạo được mã liên kết."));
  }
}

export async function revokeLink(formData: FormData): Promise<void> {
  await requireAdmin();

  const chatId = Number(formData.get("chatId"));
  if (!Number.isFinite(chatId)) return;

  // Đánh dấu, không xoá: hàng trong `admin_audit_log` phải còn tra ngược được.
  await db.revokeTelegramLink(chatId);
  revalidatePath("/admin/settings/integrations");
}
