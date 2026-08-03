import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Đăng nhập</CardTitle>
        <CardDescription>
          Dùng email và mật khẩu chủ trọ đã cấp cho bạn.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <LoginForm next={nextPath} />

        {isDemoMode && (
          <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Tài khoản demo</p>
            <p>
              Chủ trọ: <code className="font-mono">admin@nhatro.vn</code> /{" "}
              <code className="font-mono">admin123</code>
            </p>
            <p>
              Người thuê: <code className="font-mono">an@example.com</code> /{" "}
              <code className="font-mono">demo123</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
