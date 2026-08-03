import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env, getServiceRoleKey } from "@/lib/env";

/**
 * Service-role client. BYPASSES ALL RLS.
 *
 * Only three operations need it: creating a tenant account, resetting someone's
 * password, and deleting an account — all of which touch `auth.users`, which the
 * anon key cannot write.
 *
 * Never import this from a Client Component. `server-only` makes that a build
 * error rather than a silent key leak.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
