import "server-only";

import type { AgentChannel, SessionUser } from "@/types";

/**
 * Ai đang gọi một tool, và qua đường nào.
 *
 * Không có biến thể "ẩn danh". `runTool()` từ chối chạy khi thiếu `actor` — vì
 * đường đi này chạy bằng service-role (xem `lib/db/db-client.ts`), nên RLS
 * không còn là thứ chặn ai đọc gì nữa. Danh tính ở đây LÀ việc phân quyền.
 */
export interface AgentContext {
  actor: SessionUser;
  channel: AgentChannel;
  /** Chỉ có khi `channel === "telegram"`. Dùng để gửi thẻ xác nhận về đúng chỗ. */
  chatId: number | null;
  /** Một id cho mỗi tin nhắn đến, nối các dòng nhật ký của cùng một lượt. */
  requestId: string;
}

export function telegramContext(
  actor: SessionUser,
  chatId: number,
  requestId: string,
): AgentContext {
  return { actor, channel: "telegram", chatId, requestId };
}
