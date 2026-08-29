import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * Đổi mã một lần từ Supabase (Google/Facebook, magic link, đặt lại mật khẩu)
 * lấy cookie phiên đăng nhập.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/me";

  // Từ chối URL tuyệt đối — open redirect ở đây là đưa luôn phiên đăng nhập.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/me";

  // Provider có thể trả lỗi ngay trên URL (người dùng bấm Huỷ, app chưa duyệt…).
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerError)}`,
    );
  }

  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Signup đang tắt, nên email lạ sẽ dừng ở đây. Nói rõ để người dùng biết
    // phải làm gì, thay vì để họ bấm lại mãi.
    const message = /signup|not allowed|disabled/i.test(error.message)
      ? "Email này chưa có tài khoản trong hệ thống. Liên hệ chủ trọ để được tạo."
      : "Link đã hết hạn hoặc không hợp lệ. Thử lại.";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  // Đăng nhập xong ở tầng Auth chưa đủ: phải có hồ sơ và hồ sơ phải còn hoạt động.
  const user = await getCurrentUser();
  if (!user) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "Tài khoản chưa được kích hoạt hoặc đã bị khoá. Liên hệ chủ trọ.",
      )}`,
    );
  }

  // Đặt lại mật khẩu thì đích đến đã nằm sẵn trong `next`; còn lại đưa về đúng
  // trang chủ theo vai trò.
  const destination =
    safeNext === "/me" ? (user.role === "admin" ? "/admin" : "/me") : safeNext;

  return NextResponse.redirect(`${origin}${destination}`);
}
