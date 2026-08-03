import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/env";

/**
 * Exchanges the one-time code from a Supabase email link (password reset,
 * magic link, OAuth) for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Reject absolute URLs — an open redirect here would be handed a live session.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (isDemoMode || !code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Link đã hết hạn. Yêu cầu link mới.")}`,
    );
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
