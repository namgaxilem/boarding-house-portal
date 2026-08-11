import "server-only";

import { supabaseAdapter } from "./supabase-adapter";
import type { Repository } from "./repository";

/**
 * The one place a storage backend is wired in.
 *
 * Pages and Server Actions import `db` and know nothing else — no page contains
 * the word "supabase". Swapping backends means changing this line and writing an
 * adapter that satisfies `Repository`.
 */
export const db: Repository = supabaseAdapter;

export type {
  EndTenancyInput,
  IdDocumentInput,
  RecentEvent,
  Repository,
  Roommate,
  RoomEventInput,
  RoomFilter,
  RoomInput,
  TenancyInput,
  TenantInput,
  WifiInput,
} from "./repository";
