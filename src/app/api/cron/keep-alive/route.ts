import { NextResponse, type NextRequest } from "next/server";

import { authorizeCron } from "@/lib/cron-auth";
import { db } from "@/lib/db";

/**
 * Keeps a Supabase free-tier project from auto-pausing after 7 idle days.
 *
 * Call daily from GitHub Actions (see .github/workflows/keep-alive.yml):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/keep-alive
 */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  // A trivial query is enough to count as activity.
  const rooms = await db.listVacantRooms();

  return NextResponse.json({ ok: true, vacantRooms: rooms.length });
}
