import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/proxy";

/**
 * Proxy — what Next.js called Middleware before v16.
 *
 * Two jobs:
 *   1. Keep the Supabase session fresh (it rotates access tokens).
 *   2. Optimistic route guarding, so a signed-out visitor never sees a flash of
 *      the dashboard.
 *
 * This is NOT the security boundary. `requireAdmin()` in the layouts and RLS in
 * the database are what actually protect data — a proxy check can be bypassed by
 * POSTing to a Server Action directly.
 *
 * It never queries the database, so it stays cheap on every request. That is why
 * the role check lives in the admin layout instead of here: reading `role` would
 * cost a round-trip per request, and the layout has to check anyway.
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

/** Supabase stores its session as `sb-<project-ref>-auth-token[.n]` cookies. */
function clearAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) response.cookies.delete(cookie.name);
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // The app bounced someone here because their session no longer resolves to a
  // live account (deleted or disabled). Drop the stale cookies and let the login
  // page render — redirecting them "home" again would loop forever.
  if (pathname === "/login" && request.nextUrl.searchParams.has("expired")) {
    const cleared = NextResponse.next();
    clearAuthCookies(request, cleared);
    return cleared;
  }

  const { response, user } = await updateSupabaseSession(request);
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!user) {
    if (isPublic) return response;

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // An already signed-in visitor hitting /login is handled by the page itself,
  // not here: sending them "home" needs their role, and reading it would cost a
  // database round-trip on every single request just to serve one rare case.
  return response;
}

export const config = {
  matcher: [
    // `js|wasm|webmanifest` là phần thêm cho PWA: `/sw.js`, `/zxing_reader.wasm`
    // và `/manifest.webmanifest` đều được trình duyệt tải TRƯỚC hoặc NGOÀI phiên
    // đăng nhập. Để chúng đi qua proxy thì khách chưa đăng nhập sẽ nhận về HTML
    // của trang /login — service worker không đăng ký được, nút "Cài đặt" không
    // bao giờ xuất hiện, và lỗi thì im lặng.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|wasm|webmanifest)$).*)",
  ],
};
