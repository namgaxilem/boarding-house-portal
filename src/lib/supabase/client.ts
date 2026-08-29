import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/** Supabase client for Client Components. Uses the public anon key only. */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
