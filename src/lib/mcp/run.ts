import "server-only";

import { db } from "@/lib/db";
import { runAsService } from "@/lib/db/db-client";
import { describeError } from "@/lib/action-result";

import type { AgentContext } from "./context";
import type { ToolDefinition, ToolOutput } from "./tool";

/**
 * Nút thắt DUY NHẤT mà mọi lời gọi tool đi qua.
 *
 * Bốn việc, theo đúng thứ tự này:
 *
 *   1. zod parse — handler không bao giờ nhìn thấy văn của mô hình, chỉ thấy
 *      tham số đã có kiểu. Sai schema thì dừng ở đây, không vào tới database.
 *   2. mở một dòng `admin_audit_log` ở trạng thái `pending`.
 *   3. chạy handler BÊN TRONG `runAsService()` — đây là chỗ duy nhất trong cả
 *      repo gọi hàm đó (xem `lib/db/db-client.ts`).
 *   4. đóng dòng nhật ký với kết quả thật.
 *
 * Bước 2 và 4 không phải trang trí. Đường đi này chạy bằng service-role, nên RLS
 * không còn ghi lại gì thay ta nữa — `admin_audit_log` là bản ghi DUY NHẤT về
 * việc trợ lý đã làm gì. Vì vậy nó ship ở đợt 1, không phải "để sau".
 *
 * Ghi cả thao tác ĐỌC. Khi dữ liệu dính tới người ở trọ thì "ai đã hỏi gì về ai"
 * đúng là câu mà một nhật ký sinh ra để trả lời.
 */
export async function runTool(
  tool: ToolDefinition,
  rawInput: unknown,
  ctx: AgentContext,
): Promise<ToolOutput> {
  const parsed = tool.inputSchema.safeParse(rawInput ?? {});

  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => issue.message).join("; ");
    await logDenied(tool, ctx, rawInput, `THAM_SO_KHONG_HOP_LE: ${detail}`);
    return { text: `Tham số không hợp lệ: ${detail}` };
  }

  const args = parsed.data as Record<string, unknown>;
  const startedAt = Date.now();

  const auditId = await db
    .openAuditLog({
      profileId: ctx.actor.id,
      actorEmail: ctx.actor.email,
      channel: ctx.channel,
      toolName: tool.name,
      readOnly: tool.readOnly,
      args,
      requestId: ctx.requestId,
    })
    .catch((error) => {
      // Không chặn: mất một dòng nhật ký thì tệ, nhưng bot im lặng vì không ghi
      // được nhật ký thì người dùng không hiểu chuyện gì và cũng không sửa được.
      console.error("[audit] không mở được dòng nhật ký", error);
      return null;
    });

  try {
    const output = await runAsService(() => tool.run(parsed.data, ctx));
    if (auditId !== null) {
      await db.closeAuditLog(auditId, "ok", { durationMs: Date.now() - startedAt });
    }
    return output;
  } catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    if (auditId !== null) {
      await db.closeAuditLog(auditId, "error", {
        errorCode: code,
        durationMs: Date.now() - startedAt,
      });
    }

    // Dịch qua CHÍNH cái bảng mà web dùng, để bot và giao diện không bao giờ
    // diễn đạt cùng một kết quả theo hai cách khác nhau.
    return { text: describeError(error, "Không lấy được dữ liệu. Thử lại sau.") };
  }
}

async function logDenied(
  tool: ToolDefinition,
  ctx: AgentContext,
  rawInput: unknown,
  errorCode: string,
) {
  try {
    const id = await db.openAuditLog({
      profileId: ctx.actor.id,
      actorEmail: ctx.actor.email,
      channel: ctx.channel,
      toolName: tool.name,
      readOnly: tool.readOnly,
      args: { raw: rawInput },
      requestId: ctx.requestId,
    });
    await db.closeAuditLog(id, "denied", { errorCode });
  } catch (error) {
    console.error("[audit] không ghi được lần từ chối", error);
  }
}
