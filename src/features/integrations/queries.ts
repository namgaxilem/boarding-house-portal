import "server-only";

import { cache } from "react";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { checkBudget } from "@/lib/agent/budget";
import { isAgentConfigured, isTelegramConfigured } from "@/lib/env";

/**
 * Trạng thái của trợ lý, cho `/admin/settings/integrations`.
 *
 * Guard lặp lại ở đây dù layout đã gọi — cùng lý do ghi ở `features/gate/queries.ts`.
 */
export const getAssistantOverview = cache(async () => {
  const admin = await requireAdmin();

  const [links, audit, budget] = await Promise.all([
    db.listTelegramLinks(),
    db.listAuditLog(20),
    checkBudget(admin.id),
  ]);

  return {
    telegramConfigured: isTelegramConfigured(),
    agentConfigured: isAgentConfigured(),
    links,
    audit,
    budget,
  };
});
