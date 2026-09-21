#!/usr/bin/env node
/**
 * Đăng ký webhook Telegram. Chạy MỘT LẦN sau khi deploy, và mỗi lần đổi secret.
 *
 *   npm run telegram:webhook              # dùng NEXT_PUBLIC_SITE_URL
 *   npm run telegram:webhook -- <url>     # hoặc chỉ định URL gốc
 *   npm run telegram:webhook -- --info    # xem trạng thái hiện tại
 *   npm run telegram:webhook -- --delete  # gỡ webhook
 *
 * Xoay secret = gọi lại `setWebhook` với giá trị mới; Telegram ghi đè, không có
 * bước thu hồi riêng.
 */

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

if (!token || !secret) {
  console.error("Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_WEBHOOK_SECRET trong .env.local.");
  process.exit(1);
}

const api = `https://api.telegram.org/bot${token}`;
const args = process.argv.slice(2);

async function call(method, body) {
  const response = await fetch(`${api}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(`${method}: ${payload.description}`);
  return payload.result;
}

async function main() {
  if (args.includes("--info")) {
    console.log(JSON.stringify(await call("getWebhookInfo"), null, 2));
    return;
  }

  if (args.includes("--delete")) {
    await call("deleteWebhook", { drop_pending_updates: false });
    console.log("Đã gỡ webhook.");
    return;
  }

  const base = (args.find((arg) => !arg.startsWith("--")) ?? process.env.NEXT_PUBLIC_SITE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  if (!base.startsWith("https://")) {
    console.error(
      `URL phải là HTTPS công khai, nhận được: "${base || "(trống)"}".\n` +
        "Telegram không gọi được http:// hay localhost. Chưa deploy thì dùng " +
        "`npm run telegram:dev`.",
    );
    process.exit(1);
  }

  await call("setWebhook", {
    url: `${base}/api/telegram/webhook`,
    secret_token: secret,
    // Chốt thật, không phải trang trí: chặn Telegram gửi sang các loại update
    // (sửa tin, reaction, bài kênh, thành viên vào/ra) mà app không có handler.
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });

  console.log(`Đã đăng ký webhook: ${base}/api/telegram/webhook`);
  console.log(JSON.stringify(await call("getWebhookInfo"), null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
