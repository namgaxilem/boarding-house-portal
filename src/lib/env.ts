/**
 * Environment configuration.
 *
 * The app talks to Supabase and nothing else — there is no in-memory fallback.
 * Missing configuration fails loudly on the first request rather than silently
 * serving an empty or fake database.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000",

  /**
   * Mã xác minh Google Search Console (dạng `google-site-verification`).
   *
   * Không có Search Console thì không nộp được sitemap, không biết Google đã
   * lập chỉ mục trang nào, không thấy từ khoá nào đang ra kết quả. Để trống thì
   * thẻ meta không được chèn — đó là mặc định hợp lệ, chỉ là chưa dùng được
   * công cụ.
   *
   * Lấy mã: Search Console → Add property → HTML tag → copy phần `content="…"`.
   */
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ?? "",

  /** Resend API key. Trống thì thông báo chỉ hiện trong app, không gửi email. */
  resendApiKey: process.env.RESEND_API_KEY?.trim() ?? "",
  /** Người gửi, dạng 'Nhà trọ Tân Phát <no-reply@domain.com>'. */
  emailFrom: process.env.EMAIL_FROM?.trim() ?? "",

  /**
   * Username của bot Telegram, KHÔNG có "@".
   *
   * Đọc ngay lúc nạp module được vì nó không phải bí mật — nó nằm công khai
   * trong link `t.me/<username>`. Thiếu thì trang cài đặt hạ xuống hiện mã trần
   * kèm câu "gõ /start <mã> cho bot", thay vì một liên kết bấm được.
   */
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "") ?? "",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/**
 * Email là TÙY CHỌN, khác Supabase.
 *
 * Thiếu cấu hình email thì app vẫn chạy đủ: thông báo vẫn nằm trong app, chỉ là
 * không có bản gửi vào hộp thư. Vì vậy đây là hàm kiểm tra, không phải hàm chặn.
 */
export const isEmailConfigured = Boolean(env.resendApiKey && env.emailFrom);

/**
 * Khoá cổng TTLock — cũng TÙY CHỌN, và tùy chọn theo hai tầng.
 *
 * `houseConfig.features.smartGate` quyết định có HIỆN giao diện cổng không.
 * Bốn biến dưới đây quyết định có GỌI ĐƯỢC API không. Bật cờ mà chưa điền env là
 * trạng thái hợp lệ và hữu ích: /admin/gate hiện danh sách việc cần làm để cài
 * đặt, đúng cho một hai tuần chờ TTLock duyệt tài khoản nhà phát triển.
 *
 * Đọc trong hàm chứ không đọc lúc nạp module: `next build` phải chạy được trên
 * máy không có `.env.local`, giống `assertSupabaseConfigured()` bên dưới.
 */
export function isTTLockConfigured() {
  return Boolean(
    process.env.TTLOCK_CLIENT_ID?.trim() &&
      process.env.TTLOCK_CLIENT_SECRET?.trim() &&
      process.env.TTLOCK_USERNAME?.trim() &&
      process.env.TTLOCK_PASSWORD?.trim(),
  );
}

/**
 * Guards every entry point that needs a database.
 *
 * Checked at call time, not at module load: `next build` must be able to compile
 * the app on a machine that has no `.env.local`.
 */
export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Chưa cấu hình Supabase. Đặt NEXT_PUBLIC_SUPABASE_URL và " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY trong .env.local " +
        "(chạy `npx supabase start` rồi `npx supabase status` để lấy giá trị).",
    );
  }
}

/** Service-role key. Server-only — never expose to the browser. */
export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "Thiếu SUPABASE_SERVICE_ROLE_KEY — cần key này để tạo/xoá tài khoản người thuê.",
    );
  }
  return key;
}

/**
 * Bot Telegram — TÙY CHỌN, và tùy chọn theo hai tầng giống TTLock.
 *
 * `houseConfig.features.assistant` quyết định có HIỆN tab Trợ lý không; biến môi
 * trường quyết định nó có CHẠY được không. Bật cờ mà chưa điền env là trạng thái
 * hợp lệ: trang cài đặt hiện danh sách việc cần làm.
 *
 * Nhưng ở phía WEBHOOK thì ngược lại — thiếu cấu hình là đóng (503), không phải
 * chạy nửa vời. Xem `lib/telegram/verify.ts`.
 */
export function isTelegramConfigured() {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_WEBHOOK_SECRET?.trim(),
  );
}

/** Token bot. Ném lỗi khi được GỌI, không lúc nạp module. */
export function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("Thiếu TELEGRAM_BOT_TOKEN — lấy từ @BotFather trên Telegram.");
  return token;
}

/**
 * Khoá AI tách riêng khỏi khoá bot, cố ý.
 *
 * Liên kết tài khoản, `/help`, `/huy` không cần AI. Tách ra thì cấu hình được
 * từng phần: dựng xong bot rồi mới bật trợ lý, và hết hạn mức thì bot vẫn trả
 * lời được những câu cố định.
 *
 * KHÔNG đổi tên biến: `new Anthropic()` tự đọc đúng `ANTHROPIC_API_KEY`.
 */
export function isAgentConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/**
 * Trần chi phí trợ lý mỗi admin mỗi ngày, tính bằng USD.
 *
 * Thiếu biến thì rơi về 1.00 — KHÔNG rơi về vô hạn. Một ngân sách vắng mặt mà
 * hiểu là "không giới hạn" là cách người ta biết chuyện qua email hoá đơn.
 */
export function getAgentDailyBudgetUsd() {
  const raw = Number(process.env.TELEGRAM_AGENT_DAILY_USD?.trim());
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}
