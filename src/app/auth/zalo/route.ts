import { NextResponse, type NextRequest } from "next/server";

import {
  ZALO_MODE_COOKIE,
  ZALO_STATE_COOKIE,
  ZALO_VERIFIER_COOKIE,
  buildAuthorizeUrl,
  createChallenge,
  createState,
  createVerifier,
  getZaloCredentials,
} from "@/lib/auth/zalo";
import { getCurrentUser } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import { houseConfig } from "@/config/site";

/**
 * Bắt đầu luồng Zalo.
 *
 * Cùng một endpoint phục vụ hai việc, phân biệt bằng việc người dùng đã đăng
 * nhập hay chưa:
 *   - đã đăng nhập  -> LIÊN KẾT tài khoản Zalo vào hồ sơ hiện tại
 *   - chưa đăng nhập -> ĐĂNG NHẬP bằng tài khoản Zalo đã liên kết trước đó
 */
export async function GET(request: NextRequest) {
  if (!houseConfig.login.zalo) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Đăng nhập Zalo chưa được bật.")}`,
        request.url,
      ),
    );
  }

  const credentials = getZaloCredentials();
  if (!credentials) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          "Chưa cấu hình ZALO_APP_ID / ZALO_APP_SECRET.",
        )}`,
        request.url,
      ),
    );
  }

  const user = await getCurrentUser();
  const mode = user ? "link" : "login";

  const state = createState();
  const verifier = createVerifier();
  const challenge = await createChallenge(verifier);

  const authorizeUrl = buildAuthorizeUrl({
    appId: credentials.appId,
    redirectUri: `${env.siteUrl}/auth/zalo/callback`,
    state,
    challenge,
  });

  const response = NextResponse.redirect(authorizeUrl);

  // `state` chống CSRF, `verifier` là nửa còn lại của PKCE. Cả hai chỉ sống
  // trong lúc chuyển hướng, nên đặt hạn 10 phút và httpOnly.
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/auth/zalo",
    maxAge: 600,
  };

  response.cookies.set(ZALO_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(ZALO_VERIFIER_COOKIE, verifier, cookieOptions);
  response.cookies.set(ZALO_MODE_COOKIE, mode, cookieOptions);

  return response;
}
