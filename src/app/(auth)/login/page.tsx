import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";
import { SocialButtons } from "@/features/auth/components/social-buttons";
import { getCurrentUser } from "@/lib/auth/dal";
import { HOME_PATH } from "@/lib/constants";

export const metadata: Metadata = { title: "Đăng nhập" };

export const dynamic = "force-dynamic";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, expired, error } = await props.searchParams;

  // Skip the check when the app sent them here precisely because their session
  // stopped resolving — re-running it would bounce them straight back.
  if (expired === undefined) {
    const user = await getCurrentUser();
    if (user) redirect(HOME_PATH[user.role]);
  }

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
        {typeof error === "string" && error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {expired !== undefined && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground dark:text-warning">
            Phiên đăng nhập đã hết hiệu lực. Đăng nhập lại để tiếp tục.
          </p>
        )}

        <LoginForm next={nextPath} />

        <SocialButtons next={nextPath} />
      </CardContent>
    </Card>
  );
}
