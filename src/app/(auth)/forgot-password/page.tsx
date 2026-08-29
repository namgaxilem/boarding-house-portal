import type { Metadata } from "next";
import { Link } from "@/components/common/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/components/password-forms";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quên mật khẩu</CardTitle>
        <CardDescription>
          Nhập email của bạn, hệ thống sẽ gửi link đặt lại mật khẩu.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        <p className="text-center text-sm">
          <Link
            href="/login"
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Quay lại đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
