import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { demoAdapter } from "./demo-adapter";
import { supabaseAdapter } from "./supabase-adapter";
import type { Repository } from "./repository";

/**
 * The one place a storage backend is chosen.
 *
 * Pages and Server Actions import `db` and know nothing else — no page contains
 * the word "supabase". Filling in the Supabase env vars flips the whole app over
 * with no other code change.
 */
export const db: Repository = isSupabaseConfigured ? supabaseAdapter : demoAdapter;

export type {
  EndTenancyInput,
  RecentEvent,
  Repository,
  RoomEventInput,
  RoomFilter,
  RoomInput,
  TenancyInput,
  TenantInput,
  WifiInput,
} from "./repository";
