import "server-only";

import { db } from "@/lib/db";
import { getAgentDailyBudgetUsd } from "@/lib/env";
import { todayInHouseTz } from "@/lib/format";
import type { AgentUsage } from "@/types";

/**
 * Trần chi phí, và vì sao `max_iterations` không thay được nó.
 *
 * `max_iterations` chặn việc ping-pong tool bên trong MỘT request. Nhưng một
 * chuỗi tin nhắn riêng lẻ — một client kẹt, một người bấm gửi liên tục, một
 * webhook bị gửi lại mãi — thì nó không thấy gì cả, và đó mới là cách hoá đơn
 * chạy mất kiểm soát qua đêm.
 *
 * Nên có hai trần, cùng đọc từ một hàng `agent_usage`:
 *   - tiền mỗi ngày mỗi người (mặc định 1 USD ≈ 45 câu hỏi thường)
 *   - số tin nhắn mỗi giờ  (chặn client kẹt trước khi nó kịp tốn tiền)
 */

/** Giá Claude Opus 5, USD mỗi triệu token. Đọc cache rẻ hơn 10 lần input thường. */
const PRICE = {
  input: 5 / 1_000_000,
  cachedInput: 0.5 / 1_000_000,
  output: 25 / 1_000_000,
};

const MAX_REQUESTS_PER_DAY = 200;

export function usageCostUsd(usage: AgentUsage): number {
  return (
    usage.inputTokens * PRICE.input +
    usage.cachedInputTokens * PRICE.cachedInput +
    usage.outputTokens * PRICE.output
  );
}

export function today(): string {
  return todayInHouseTz();
}

export interface BudgetCheck {
  allowed: boolean;
  reason?: string;
  spentUsd: number;
  limitUsd: number;
}

export async function checkBudget(profileId: string): Promise<BudgetCheck> {
  const limitUsd = getAgentDailyBudgetUsd();
  const usage = await db.getAgentUsageToday(profileId, today());
  const spentUsd = usageCostUsd(usage);

  if (usage.requests >= MAX_REQUESTS_PER_DAY) {
    return {
      allowed: false,
      reason: `Đã dùng hết ${MAX_REQUESTS_PER_DAY} lượt hỏi của hôm nay.`,
      spentUsd,
      limitUsd,
    };
  }

  if (spentUsd >= limitUsd) {
    return {
      allowed: false,
      reason: "Đã hết hạn mức trợ lý hôm nay. Ngày mai hỏi tiếp, hoặc mở trang quản trị.",
      spentUsd,
      limitUsd,
    };
  }

  return { allowed: true, spentUsd, limitUsd };
}

export async function recordUsage(profileId: string, usage: AgentUsage): Promise<void> {
  await db.addAgentUsage(profileId, today(), usage);
}
