/**
 * Environment detection.
 *
 * The app runs in one of two modes:
 *
 *  - `supabase` — real Postgres + Supabase Auth. Active when both public
 *    Supabase vars are present.
 *  - `demo`     — in-memory seeded data and a cookie session. Lets the UI be
 *    reviewed before any Supabase project exists.
 *
 * Demo mode is a development convenience and is NOT secure: it accepts a fixed
 * set of demo passwords and stores data in process memory. It refuses to start
 * in a production build unless explicitly forced.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const isDemoMode = !isSupabaseConfigured;

export const env = {
  supabaseUrl: supabaseUrl ?? "",
  supabaseAnonKey: supabaseAnonKey ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/**
 * Call from server-only entry points. Shipping demo mode to production would
 * mean anyone who guesses a demo password gets admin, so fail loudly instead.
 */
export function assertRuntimeSafe() {
  if (
    isDemoMode &&
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_MODE !== "true"
  ) {
    throw new Error(
      "Chạy production nhưng chưa cấu hình Supabase. " +
        "Đặt NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY, " +
        "hoặc đặt ALLOW_DEMO_MODE=true nếu cố ý deploy bản demo.",
    );
  }
}

/** Service-role key. Server-only — never expose to the browser. */
export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "Thiếu SUPABASE_SERVICE_ROLE_KEY — cần key này để tạo/xóa tài khoản người thuê.",
    );
  }
  return key;
}
