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
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

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
