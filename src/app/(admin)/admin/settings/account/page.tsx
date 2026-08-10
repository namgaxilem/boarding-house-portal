import { Suspense } from "react";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordForm } from "@/features/auth/components/password-forms";
import { requireAdmin } from "@/lib/auth/dal";
import { ROLE_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Tài khoản" };

// Form đổi mật khẩu chạy hoàn toàn ở client nên nằm trong shell tĩnh; chỉ thẻ
// thông tin tài khoản phải đợi session.
export const instant = true;

export default function AccountSettingsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <AccountCard />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
          <CardDescription>
            Cần nhập mật khẩu hiện tại để xác nhận đúng là bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

async function AccountCard() {
  const user = await requireAdmin();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tài khoản của bạn</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Họ tên</dt>
          <dd className="text-right">{user.fullName}</dd>

          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all text-right">{user.email}</dd>

          <dt className="text-muted-foreground">Vai trò</dt>
          <dd className="text-right">{ROLE_LABEL[user.role]}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}
