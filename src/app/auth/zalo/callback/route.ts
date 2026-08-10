import { NextResponse, type NextRequest } from "next/server";

import {
  ZALO_MODE_COOKIE,
  ZALO_STATE_COOKIE,
  ZALO_VERIFIER_COOKIE,
  exchangeCodeForToken,
  fetchZaloProfile,
  getZaloCredentials,
} from "@/lib/auth/zalo";
import { getCurrentUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { houseConfig } from "@/config/site";

function fail(request: NextRequest, message: string) {
  const response = NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(message)}`, request.url),
  );
  clearTempCookies(response);
  return response;
}

function clearTempCookies(response: NextResponse) {
  for (const name of [ZALO_STATE_COOKIE, ZALO_VERIFIER_COOKIE, ZALO_MODE_COOKIE]) {
    response.cookies.set(name, "", { path: "/auth/zalo", maxAge: 0 });
  }
}

export async function GET(request: NextRequest) {
  if (!houseConfig.login.zalo) {
    return fail(request, "Đăng nhập Zalo chưa được bật.");
  }

  const credentials = getZaloCredentials();
  if (!credentials) {
    return fail(request, "Chưa cấu hình ZALO_APP_ID / ZALO_APP_SECRET.");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const expectedState = request.cookies.get(ZALO_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(ZALO_VERIFIER_COOKIE)?.value;
  const mode = request.cookies.get(ZALO_MODE_COOKIE)?.value ?? "login";

  if (!code) return fail(request, "Bạn đã huỷ đăng nhập Zalo.");

  // Chặn CSRF: nếu `state` không khớp cookie thì request này do bên khác dựng ra.
  if (!state || !expectedState || state !== expectedState || !verifier) {
    return fail(request, "Phiên đăng nhập Zalo không hợp lệ. Thử lại.");
  }

  let profile;
  try {
    const accessToken = await exchangeCodeForToken({ code, verifier, credentials });
    profile = await fetchZaloProfile(accessToken);
  } catch (error) {
    return fail(request, (error as Error).message);
  }

  const admin = createAdminClient();

  /* --------------------------------------------------- chế độ LIÊN KẾT ---- */

  if (mode === "link") {
    const user = await getCurrentUser();
    if (!user) return fail(request, "Phiên đã hết hạn. Đăng nhập lại rồi liên kết.");

    // Dùng service_role: RLS cố tình chặn người thuê tự sửa `zalo_id`, nếu không
    // họ có thể gán Zalo của mình vào hồ sơ người khác.
    const { error } = await admin
      .from("profiles")
      .update({ zalo_id: profile.id })
      .eq("id", user.id);

    if (error) {
      const message = error.code === "23505"
        ? "Tài khoản Zalo này đã liên kết với một người thuê khác."
        : "Không liên kết được Zalo. Thử lại sau.";
      const response = NextResponse.redirect(
        new URL(`/me/profile?error=${encodeURIComponent(message)}`, request.url),
      );
      clearTempCookies(response);
      return response;
    }

    const response = NextResponse.redirect(new URL("/me/profile?linked=zalo", request.url));
    clearTempCookies(response);
    return response;
  }

  /* -------------------------------------------------- chế độ ĐĂNG NHẬP ---- */

  // Zalo không trả email, nên phải tra ngược từ zalo_id (đã liên kết trước đó)
  // hoặc từ số điện thoại (chỉ có nếu app đã được Zalo duyệt quyền này).
  const { data: email, error: lookupError } = await admin.rpc("find_login_email", {
    p_zalo_id: profile.id,
    p_phone: profile.phone,
  });

  if (lookupError) return fail(request, "Không tra cứu được tài khoản. Thử lại sau.");

  if (!email) {
    return fail(
      request,
      "Chưa có tài khoản nào liên kết với Zalo này. Đăng nhập bằng email một lần, " +
        "vào Cá nhân bấm “Liên kết Zalo”, lần sau sẽ vào thẳng được.",
    );
  }

  // Khớp được nhờ số điện thoại thì nhớ luôn zalo_id, lần sau khỏi phụ thuộc
  // vào quyền đọc số điện thoại của Zalo.
  await admin.from("profiles").update({ zalo_id: profile.id }).eq("email", email);

  // Bắc cầu sang phiên Supabase: sinh magic link cho email vừa tìm được rồi tự
  // đổi lấy session ngay tại server. Không có email nào được gửi đi.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !link.properties?.hashed_token) {
    return fail(request, "Không tạo được phiên đăng nhập. Thử lại sau.");
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });

  if (verifyError) return fail(request, "Không hoàn tất được đăng nhập. Thử lại sau.");

  const user = await getCurrentUser();
  if (!user) {
    await supabase.auth.signOut();
    return fail(request, "Tài khoản đã bị khoá. Liên hệ chủ trọ.");
  }

  const response = NextResponse.redirect(
    new URL(user.role === "admin" ? "/admin" : "/me", request.url),
  );
  clearTempCookies(response);
  return response;
}
