import type { Role, SessionUser } from "@/types";

/**
 * Session cookie shared by the app and by `proxy.ts`.
 *
 * Payload is `userId|role|expiresAt`, signed with HMAC-SHA256 so the role can be
 * trusted in the proxy without a database round-trip on every request.
 *
 * Web Crypto is used (not node:crypto) because the proxy runs in the Edge
 * runtime where node:crypto is unavailable.
 *
 * SECURITY: this is the demo-mode session. When Supabase Auth is wired in, the
 * Supabase cookie replaces this and `verifyCredentials` goes away — plaintext
 * demo passwords must never reach production.
 */

export const SESSION_COOKIE = "bhp_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();

function secret() {
  return (
    process.env.SESSION_SECRET ??
    "dev-only-insecure-secret-change-me-in-production-please"
  );
}

function toBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(signature);
}

/** Constant-time-ish compare so a wrong signature leaks no timing information. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface SessionPayload {
  userId: string;
  role: Role;
  expiresAt: number;
}

export async function encodeSession(user: SessionUser): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${user.id}|${user.role}|${expiresAt}`;
  return `${payload}|${await sign(payload)}`;
}

export async function decodeSession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;

  const parts = token.split("|");
  if (parts.length !== 4) return null;

  const [userId, role, expiresAtRaw, signature] = parts;
  if (role !== "admin" && role !== "tenant") return null;

  const expected = await sign(`${userId}|${role}|${expiresAtRaw}`);
  if (!safeEqual(signature, expected)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  return { userId, role, expiresAt };
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
