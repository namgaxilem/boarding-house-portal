import "server-only";

/**
 * Đăng nhập Zalo.
 *
 * Zalo KHÔNG phải provider dựng sẵn của Supabase, nên toàn bộ luồng OAuth phải
 * tự viết, rồi tự bắc cầu sang phiên đăng nhập của Supabase.
 *
 * Khác biệt quan trọng so với Google/Facebook: **Zalo không trả về email.**
 * Số điện thoại thì có, nhưng đòi quyền riêng và phải chờ Zalo duyệt app.
 * Không có email cũng không có số thì không biết đây là người thuê nào.
 *
 * Nên luồng ở đây gồm hai bước:
 *
 *   1. LIÊN KẾT — người thuê đăng nhập bằng email/mật khẩu như bình thường,
 *      rồi vào trang cá nhân bấm "Liên kết Zalo". Ta lưu `zalo_id` vào hồ sơ.
 *   2. ĐĂNG NHẬP — từ lần sau, bấm nút Zalo ở trang đăng nhập là vào thẳng;
 *      ta tra `zalo_id` ra hồ sơ tương ứng.
 *
 * Nếu app Zalo đã được duyệt quyền số điện thoại, bước 1 có thể bỏ qua: khớp
 * theo số điện thoại chủ trọ đã nhập sẵn.
 */

const ZALO_AUTHORIZE_URL = "https://oauth.zaloapp.com/v4/permission";
const ZALO_TOKEN_URL = "https://oauth.zaloapp.com/v4/access_token";
const ZALO_GRAPH_URL = "https://graph.zalo.me/v2.0/me";

export const ZALO_STATE_COOKIE = "zalo_oauth_state";
export const ZALO_VERIFIER_COOKIE = "zalo_oauth_verifier";
export const ZALO_MODE_COOKIE = "zalo_oauth_mode";

export interface ZaloCredentials {
  appId: string;
  appSecret: string;
}

export function getZaloCredentials(): ZaloCredentials | null {
  const appId = process.env.ZALO_APP_ID?.trim();
  const appSecret = process.env.ZALO_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

/* -------------------------------------------------------------------------- */
/*  PKCE                                                                      */
/* -------------------------------------------------------------------------- */

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createVerifier() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export function createState() {
  return base64Url(crypto.getRandomValues(new Uint8Array(16)));
}

/** Zalo dùng PKCE: challenge = base64url(sha256(verifier)). */
export async function createChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(digest);
}

export function buildAuthorizeUrl(options: {
  appId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}) {
  const url = new URL(ZALO_AUTHORIZE_URL);
  url.searchParams.set("app_id", options.appId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("state", options.state);
  url.searchParams.set("code_challenge", options.challenge);
  return url.toString();
}

/* -------------------------------------------------------------------------- */
/*  Gọi API Zalo                                                              */
/* -------------------------------------------------------------------------- */

interface ZaloTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: number;
  error_name?: string;
  error_description?: string;
}

export async function exchangeCodeForToken(options: {
  code: string;
  verifier: string;
  credentials: ZaloCredentials;
}): Promise<string> {
  const response = await fetch(ZALO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Zalo nhận app secret qua header, không phải trong body.
      secret_key: options.credentials.appSecret,
    },
    body: new URLSearchParams({
      code: options.code,
      app_id: options.credentials.appId,
      grant_type: "authorization_code",
      code_verifier: options.verifier,
    }),
    cache: "no-store",
  });

  const data = (await response.json()) as ZaloTokenResponse;

  if (!data.access_token) {
    throw new Error(
      `Zalo từ chối đổi mã: ${data.error_description ?? data.error_name ?? "không rõ lý do"}`,
    );
  }
  return data.access_token;
}

export interface ZaloProfile {
  id: string;
  name: string | null;
  /** Chỉ có khi app đã được Zalo duyệt quyền số điện thoại. */
  phone: string | null;
}

export async function fetchZaloProfile(accessToken: string): Promise<ZaloProfile> {
  const url = new URL(ZALO_GRAPH_URL);
  url.searchParams.set("fields", "id,name,phone");

  const response = await fetch(url, {
    headers: { access_token: accessToken },
    cache: "no-store",
  });

  const data = (await response.json()) as {
    id?: string;
    name?: string;
    phone?: string;
    error?: number;
    message?: string;
  };

  if (!data.id) {
    throw new Error(`Không đọc được hồ sơ Zalo: ${data.message ?? "không rõ lý do"}`);
  }

  return {
    id: data.id,
    name: data.name ?? null,
    phone: normalizeVietnamesePhone(data.phone),
  };
}

/** Zalo trả số dạng 84xxxxxxxxx; database lưu dạng 0xxxxxxxxx. */
export function normalizeVietnamesePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (/^84\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  if (/^0\d{9}$/.test(digits)) return digits;
  return null;
}
