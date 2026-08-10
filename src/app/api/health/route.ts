import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { db } from "@/lib/db";

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình Supabase" },
      { status: 503 },
    );
  }

  try {
    // Proves the app can actually reach Postgres, not merely that env vars exist.
    const rooms = await db.listVacantRooms();
    return NextResponse.json({ ok: true, database: "up", vacantRooms: rooms.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, database: "down", error: (error as Error).message },
      { status: 503 },
    );
  }
}
