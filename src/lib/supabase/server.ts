import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Supabase client for Server Components and Server Actions.
 *
 * Carries the signed-in user's cookies, so every query runs under that user's
 * RLS policies. This is the client to reach for by default.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh already happened in proxy.ts, so this is safe to skip.
        }
      },
    },
  });
}

/**
 * Client KHÔNG gắn cookie, dùng anon key.
 *
 * Lý do tồn tại: `createClient()` ở trên gọi `cookies()`, và gọi `cookies()` bên
 * trong một hàm `"use cache"` thì ném lỗi lúc chạy. Trang /blog và /sitemap.xml
 * đọc database qua `"use cache"` (xem `lib/db/public-posts.ts`), nên chúng cần
 * một client không đụng tới request hiện tại.
 *
 * KHÔNG phải một lối tắt bảo mật: nó vẫn mang anon key, nên mọi truy vấn chạy
 * dưới policy của vai `anon`. Bảng `posts` cấp quyền cho `anon` THEO CỘT, nên
 * đường đi này bắt buộc dùng `POST_PUBLIC_SELECT` — `select("*")` sẽ bị Postgres
 * từ chối cả câu.
 */
export function createPublicClient() {
  return createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
