import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { demoDb } from "@/lib/db/demo-store";
import { createClient } from "@/lib/supabase/server";
import { assertRuntimeSafe, isDemoMode } from "@/lib/env";
import { HOME_PATH } from "@/lib/constants";
import type { SessionUser } from "@/types";

import { SESSION_COOKIE, decodeSession } from "./session";

/**
 * Data Access Layer.
 *
 * Every server-side read of "who is signed in" goes through here. `cache()`
 * memoizes it per render pass, so a layout, a page and three leaf components all
 * asking for the user cost one lookup.
 *
 * Route guards live here rather than in each page, so a new page cannot forget
 * them: `requireAdmin()` is the only way to obtain an admin user object.
 */

/** Resolves the signed-in user id, whichever auth backend is active. */
async function currentUserId(): Promise<string | null> {
  if (isDemoMode) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    return (await decodeSession(token))?.userId ?? null;
  }

  const supabase = await createClient();
  // getUser() re-verifies the JWT with Supabase. getSession() only reads the
  // cookie and would trust a forged one — never use it for authorization.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // Reading the session first is deliberate: it touches `cookies()`, which makes
  // the request dynamic. Asserting before that would fire during the production
  // prerender pass, where "no Supabase configured" is not yet an error.
  const userId = await currentUserId();

  assertRuntimeSafe();

  if (!userId) return null;

  const profile = await db.getProfile(userId);

  // The database is authoritative: a role demoted or an account disabled after
  // the session was issued must take effect on the very next request.
  if (!profile || !profile.isActive) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  // `?expired=1` matters: the visitor may still be holding a structurally valid
  // session cookie for an account that was since deleted or disabled. Without
  // the marker the proxy would see "signed in", bounce them back here, and the
  // two would redirect at each other forever. The proxy clears the cookie when
  // it sees this flag.
  if (!user) redirect("/login?expired=1");

  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect(HOME_PATH.tenant);
  return user;
}

/* -------------------------------------------------------------------------- */
/*  Credentials                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Demo-mode credential check. In Supabase mode the login action calls
 * `supabase.auth.signInWithPassword` instead and never reaches this.
 */
export async function verifyDemoCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const profile = await db.getProfileByEmail(email.trim());
  if (!profile || !profile.isActive) return null;
  if (demoDb().passwords[profile.id] !== password) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
  };
}

export async function setDemoPassword(userId: string, password: string) {
  demoDb().passwords[userId] = password;
}

export async function checkDemoPassword(userId: string, password: string) {
  return demoDb().passwords[userId] === password;
}
