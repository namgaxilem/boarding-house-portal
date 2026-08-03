import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, decodeSession } from "@/lib/auth/session";
import { updateSupabaseSession } from "@/lib/supabase/proxy";
import { isDemoMode } from "@/lib/env";

/**
 * Proxy — what Next.js called Middleware before v16.
 *
 * Two jobs:
 *   1. Keep the Supabase session fresh (it rotates access tokens).
 *   2. Optimistic route guarding, so a signed-out visitor never sees a flash of
 *      the dashboard and each role lands on its own home.
 *
 * This is NOT the security boundary. `requireAdmin()` in the layouts and RLS in
 * the database are what actually protect data — a proxy check can be bypassed by
 * calling a Server Action directly.
 */

const PUBLIC_PATHS = new Set([
  "/",
  "/rooms",
  "/contact",
  "/login",
  "/forgot-password",
  "/reset-password",
]);

const PUBLIC_PREFIXES = ["/api/health", "/api/cron", "/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.has(pathname);

  // The app bounced someone here because their session no longer resolves to a
  // live account (deleted, disabled, or a demo restart). Drop the stale cookie
  // and let the login page render — redirecting them "home" again would loop.
  if (pathname === "/login" && request.nextUrl.searchParams.has("expired")) {
    const cleared = NextResponse.next();
    cleared.cookies.delete(SESSION_COOKIE);
    return cleared;
  }

  // `role` is only known cheaply in demo mode, where it is signed into the
  // cookie. In Supabase mode the role check happens in the admin layout, one
  // extra hop but no per-request database round-trip here.
  let response = NextResponse.next({ request });
  let signedIn = false;
  let role: "admin" | "tenant" | null = null;

  if (isDemoMode) {
    const session = await decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
    signedIn = session !== null;
    role = session?.role ?? null;
  } else {
    const result = await updateSupabaseSession(request);
    response = result.response;
    signedIn = result.user !== null;
  }

  if (!signedIn) {
    if (isPublic) return response;

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL(role === "tenant" ? "/me" : "/admin", request.url));
  }

  // Redirect rather than 403: a tenant should not learn which admin routes exist.
  if (pathname.startsWith("/admin") && role === "tenant") {
    return NextResponse.redirect(new URL("/me", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
