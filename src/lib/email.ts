import "server-only";

import { env, isEmailConfigured } from "@/lib/env";
import { houseConfig } from "@/config/site";

/**
 * Gửi email qua Resend, bằng `fetch` thuần.
 *
 * Không thêm SDK: cả tính năng này là một lần POST tới một URL. Một dependency
 * nữa để tiết kiệm mười dòng code là cái giá phải trả mỗi lần `npm audit` kêu.
 *
 * Email ở đây luôn là BẢN SAO của một thông báo trong app (bảng `notifications`),
 * không phải kênh độc lập. Gửi thất bại thì người thuê vẫn thấy thông báo khi mở
 * app — nên hàm này KHÔNG BAO GIỜ throw, chỉ trả về true/false.
 *
 * Chưa có SMS và chưa có push iOS/Android — cố ý, xem chú thích ở migration 0007.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  heading: string;
  /** Mỗi phần tử là một đoạn. Text thuần — sẽ được escape trước khi vào HTML. */
  lines: string[];
  action?: { label: string; url: string };
  footer?: string;
}

/** Chặn HTML injection: nội dung email được dựng từ tên người, ghi chú của chủ trọ… */
function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHtml(message: EmailMessage) {
  const paragraphs = message.lines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#1f2937">${escapeHtml(line)}</p>`,
    )
    .join("");

  const button = message.action
    ? `<p style="margin:24px 0 0">
         <a href="${encodeURI(message.action.url)}"
            style="display:inline-block;padding:11px 20px;border-radius:8px;background:#0f766e;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">
           ${escapeHtml(message.action.label)}
         </a>
       </p>`
    : "";

  const footer = escapeHtml(
    message.footer ??
      `${houseConfig.name} · ${houseConfig.contact.phone}. Email tự động, vui lòng không trả lời.`,
  );

  // Inline CSS và bảng: hộp thư (nhất là Gmail) bỏ hết <style> ở <head>.
  return `<!doctype html>
<html lang="vi"><body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    <h1 style="margin:0 0 16px;font-size:19px;line-height:1.4;color:#111827">${escapeHtml(message.heading)}</h1>
    ${paragraphs}
    ${button}
    <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280">${footer}</p>
  </div>
</body></html>`;
}

function renderText(message: EmailMessage) {
  const parts = [message.heading, "", ...message.lines];
  if (message.action) parts.push("", `${message.action.label}: ${message.action.url}`);
  return parts.join("\n");
}

/**
 * Trả về true nếu email đã được nhận để gửi.
 *
 * false có ba nghĩa: chưa cấu hình, Resend từ chối, hoặc mạng lỗi. Người gọi
 * dùng nó để quyết định có ghi `notifications.email_sent_at` hay không, chứ
 * không để báo lỗi cho người dùng — họ không làm gì sai cả.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!isEmailConfigured) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [message.to],
        subject: message.subject,
        html: renderHtml(message),
        text: renderText(message),
      }),
      // Không để một API chậm giữ Server Action lại: qua 10 giây thì bỏ email,
      // thông báo trong app đã được lưu trước đó rồi.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("[email] Resend trả về lỗi", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("[email] Không gửi được email", error);
    return false;
  }
}

/** Link tuyệt đối cho nút trong email — hộp thư không hiểu đường dẫn tương đối. */
export function absoluteUrl(path: string) {
  return new URL(path, env.siteUrl).toString();
}
