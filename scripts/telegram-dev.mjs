#!/usr/bin/env node
/**
 * Cầu long-poll cho lúc chưa deploy.
 *
 * Telegram chỉ gửi webhook tới HTTPS công khai, nên `localhost` không nhận được
 * gì. Script này gọi `getUpdates` rồi POST từng update vào webhook của dev
 * server, kèm đúng header secret — không cần tunnel, không cần tài khoản gì thêm.
 *
 * ⚠️ DÙNG MỘT BOT RIÊNG CHO DEV. `getUpdates` và webhook loại trừ nhau: chạy
 * script này là nó gọi `deleteWebhook`, và nếu đó là bot production thì
 * production ngừng nhận tin cho tới khi đăng ký lại.
 *
 * Script KHÔNG tái hiện được ngữ nghĩa gửi-lại của Telegram và không thử được ca
 * sai-secret. Trước khi deploy vẫn nên chạy một lần qua tunnel thật
 * (`cloudflared tunnel --url http://localhost:3000`) như một smoke test.
 *
 *   npm run telegram:dev
 */

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const target = process.env.TELEGRAM_DEV_TARGET?.trim() || "http://localhost:3000";

if (!token || !secret) {
  console.error(
    "Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_WEBHOOK_SECRET trong .env.local.\n" +
      "Token lấy từ @BotFather; secret sinh bằng `openssl rand -hex 32`.",
  );
  process.exit(1);
}

const api = `https://api.telegram.org/bot${token}`;
const webhook = `${target}/api/telegram/webhook`;

async function callTelegram(method, body) {
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
  // getUpdates không chạy được khi webhook đang đăng ký — gỡ trước.
  await callTelegram("deleteWebhook", { drop_pending_updates: false });

  const me = await callTelegram("getMe");
  console.log(`Đang nghe cho @${me.username} → ${webhook}`);
  console.log("Ctrl+C để dừng.\n");

  let offset = 0;

  for (;;) {
    let updates;
    try {
      updates = await callTelegram("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query"],
      });
    } catch (error) {
      console.error("getUpdates lỗi:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      continue;
    }

    for (const update of updates) {
      offset = update.update_id + 1;
      const preview = update.message?.text ?? update.callback_query?.data ?? "(không có text)";
      console.log(`→ ${update.update_id}: ${preview}`);

      try {
        const started = Date.now();
        const response = await fetch(webhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Telegram-Bot-Api-Secret-Token": secret,
          },
          body: JSON.stringify(update),
        });
        console.log(`   ${response.status} trong ${Date.now() - started}ms`);
      } catch (error) {
        console.error("   không gọi được webhook:", error.message);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
