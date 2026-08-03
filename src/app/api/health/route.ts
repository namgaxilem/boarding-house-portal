import { NextResponse } from "next/server";

import { isDemoMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    mode: isDemoMode ? "demo" : "supabase",
  });
}
