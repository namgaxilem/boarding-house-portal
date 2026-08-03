import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChangePasswordForm } from "@/features/auth/components/password-forms";
import { OwnProfileForm } from "@/features/tenants/components/own-profile-form";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/constants";
import { initials } from "@/lib/format";

export const metadata: Metadata = { title: "Thông tin cá nhân" };

export default async function MyProfilePage() {
  const user = await requireUser();
  const profile = await db.getProfile(user.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <Avatar className="size-12">
            <AvatarFallback className="text-sm">{initials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.fullName}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin của tôi</CardTitle>
          <CardDescription>
            Email do chủ trọ quản lý. Cần đổi email thì báo chủ trọ.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {profile && <OwnProfileForm profile={profile} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
