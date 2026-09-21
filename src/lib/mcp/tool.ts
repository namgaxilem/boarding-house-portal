import "server-only";

import type { z } from "zod";

import type { AgentContext } from "./context";

/**
 * Khai một tool ĐÚNG MỘT LẦN, dùng cho cả hai transport.
 *
 * Bot Telegram ánh xạ nó sang `betaZodTool` của `@anthropic-ai/sdk`; endpoint
 * MCP (đợt sau) ánh xạ sang `server.registerTool` của SDK MCP. Cả hai đều nhận
 * thẳng một zod schema, nên hai adapter đó mỗi cái khoảng 15 dòng — đó là lý do
 * `inputSchema` ở đây là zod chứ không phải JSON Schema viết tay.
 *
 * `ToolOutput` cố ý chỉ có `text`: transport nào cũng bọc lại được, và một tool
 * trả về cấu trúc riêng là một tool mà hai transport sẽ render khác nhau.
 */

export interface ToolOutput {
  text: string;
}

export interface ToolDefinition<TSchema extends z.ZodType = z.ZodType> {
  /** snake_case tiếng Việt. ĐÂY LÀ API CÔNG KHAI — đổi tên là breaking change. */
  name: string;
  /** Nhãn ngắn, Claude Code hiện cho người dùng thấy. */
  title: string;
  /** Tiếng Việt: dùng KHI NÀO, trả về GÌ, và cố ý KHÔNG làm gì. */
  description: string;
  inputSchema: TSchema;
  /**
   * `true` = chạy thẳng. `false` = dừng lại chờ chủ trọ bấm xác nhận.
   *
   * Không phải một ghi chú: `registry.ts` lọc theo đúng cờ này để dựng bộ tool
   * cho từng đợt, nên "chỉ đọc" là một thuộc tính của dữ liệu chứ không phải
   * một nhánh code ai đó có thể quên.
   */
  readOnly: boolean;
  run(input: z.infer<TSchema>, ctx: AgentContext): Promise<ToolOutput>;
}

/** Giữ kiểu của `inputSchema` chảy được vào `run`. */
export function defineTool<TSchema extends z.ZodType>(
  definition: ToolDefinition<TSchema>,
): ToolDefinition<TSchema> {
  return definition;
}

export function text(value: string): ToolOutput {
  return { text: value };
}
