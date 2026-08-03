import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/components/password-forms";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Đặt mật khẩu mới</CardTitle>
        <CardDescription>Chọn mật khẩu dễ nhớ nhưng ít nhất 6 ký tự.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ResetPasswordForm />
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
