import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";

import { isAgentConfigured } from "@/lib/env";
import type { AgentContext } from "@/lib/mcp/context";
import { READ_TOOLS } from "@/lib/mcp/registry";
import { runTool } from "@/lib/mcp/run";
import type { ToolDefinition } from "@/lib/mcp/tool";
import type { AgentUsage } from "@/types";

import { checkBudget, recordUsage } from "./budget";
import { STATIC_RULES, volatileContext } from "./system-prompt";

/**
 * Một lượt hỏi–đáp.
 *
 * Dùng **tool runner** của SDK chứ không viết vòng lặp tay: registry đã mang sẵn
 * zod schema nên `betaZodTool` là ánh xạ thẳng, và không có vòng lặp nào để nuôi.
 *
 * KHÔNG dùng `@anthropic-ai/claude-agent-sdk` — cái đó là Claude Code đóng gói
 * thành thư viện, kèm Read/Write/Bash/Glob và một harness filesystem. Không thứ
 * nào trong đó thuộc về một bot nhà trọ, và nó là runtime thứ hai nằm trong tiến
 * trình Next.
 *
 * KHÔNG giữ ngữ cảnh giữa các tin nhắn. Mỗi tin là một mảng `messages` mới. Ba
 * lý do: chi phí mỗi câu phẳng và đoán được; khớp với lập luận chống-chat ở
 * `docs/11` mục 5; và — điểm bảo mật — một ngữ cảnh đã bị đầu độc KHÔNG sống
 * sang câu hỏi sau.
 */

const MODEL = "claude-opus-5";
const MAX_TOKENS = 8_000;
const MAX_ITERATIONS = 8;

let client: Anthropic | null = null;

/** Dựng muộn: `next build` phải chạy được trên máy không có khoá. */
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

function toAnthropicTool(tool: ToolDefinition, ctx: AgentContext) {
  return betaZodTool({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    // Mọi lời gọi đi qua `runTool`: zod parse → nhật ký → runAsService → nhật ký.
    // Không handler nào được gọi thẳng, kể cả từ đây.
    run: async (input: unknown) => (await runTool(tool, input, ctx)).text,
  });
}

export interface AgentReply {
  text: string;
  usage: AgentUsage;
}

export async function runAgent(prompt: string, ctx: AgentContext): Promise<AgentReply> {
  const empty: AgentUsage = {
    requests: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
  };

  if (!isAgentConfigured()) {
    return {
      text: "Trợ lý chưa được cấu hình. Chủ trọ cần điền ANTHROPIC_API_KEY.",
      usage: empty,
    };
  }

  const budget = await checkBudget(ctx.actor.id);
  if (!budget.allowed) {
    return { text: budget.reason ?? "Đã hết hạn mức trợ lý hôm nay.", usage: empty };
  }

  const usage: AgentUsage = { ...empty, requests: 1 };

  try {
    const runner = getClient().beta.messages.toolRunner({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      max_iterations: MAX_ITERATIONS,
      // Tra cứu rồi tóm tắt, không phải viết code. Token suy nghĩ tính tiền như
      // output, nên `low` là đòn bẩy chi phí lớn thứ hai sau cache.
      // Cố ý KHÔNG khai `thinking`: Opus 5 chạy adaptive mặc định.
      output_config: { effort: "low" },
      // Opus 5 có thể trả `stop_reason: "refusal"` kèm HTTP 200. Không có
      // fallback thì đó là một ô trống im lặng trong cửa sổ chat.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: STATIC_RULES, cache_control: { type: "ephemeral" } },
        { type: "text", text: volatileContext() },
      ],
      tools: READ_TOOLS.map((tool) => toAnthropicTool(tool, ctx)),
      messages: [{ role: "user", content: prompt }],
    });

    for await (const message of runner) {
      usage.inputTokens += message.usage.input_tokens ?? 0;
      usage.cachedInputTokens += message.usage.cache_read_input_tokens ?? 0;
      usage.outputTokens += message.usage.output_tokens ?? 0;
    }

    const final = await runner.done();

    // Không có server tool nào trong registry (không web_search, không code
    // execution), nên `pause_turn` không xảy ra — đừng thêm mà không đọc lại chỗ này.
    if (final.stop_reason === "refusal") {
      return { text: "Trợ lý từ chối trả lời câu này. Thử hỏi cách khác.", usage };
    }

    const text = final.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return { text: text || "Không có gì để trả lời.", usage };
  } catch (error) {
    console.error("[agent] lượt chạy thất bại", error);

    if (error instanceof Anthropic.RateLimitError) {
      return { text: "Trợ lý đang quá tải, thử lại sau một phút.", usage };
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return { text: "Không kết nối được tới trợ lý. Thử lại sau.", usage };
    }
    return { text: "Trợ lý gặp lỗi. Thử lại sau, hoặc mở trang quản trị.", usage };
  } finally {
    // Ghi hạn mức kể cả khi lỗi: token đã sinh ra thì đã trả tiền.
    await recordUsage(ctx.actor.id, usage);
  }
}
