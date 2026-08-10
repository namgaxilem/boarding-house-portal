import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";

/**
 * Keeps a Supabase free-tier project from auto-pausing after 7 idle days.
 *
 * Call daily from GitHub Actions (see .github/workflows/keep-alive.yml):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/keep-alive
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  // Without a secret the endpoint stays closed rather than open by default.
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET chưa được cấu hình" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A trivial query is enough to count as activity.
  const rooms = await db.listVacantRooms();

  return NextResponse.json({ ok: true, vacantRooms: rooms.length });
}
