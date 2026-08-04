import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircleIcon, CheckCircle2Icon, LinkIcon, ShieldCheckIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChangePasswordForm } from "@/features/auth/components/password-forms";
import { OwnProfileForm } from "@/features/tenants/components/own-profile-form";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/constants";
import { initials } from "@/lib/format";
import { houseConfig } from "@/config/site";

export const metadata: Metadata = { title: "Thông tin cá nhân" };

export default async function MyProfilePage(props: PageProps<"/me/profile">) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const profile = await db.getProfile(user.id);

  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const justLinked = searchParams.linked === "zalo";

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {justLinked && (
        <Alert variant="success" role="status">
          <CheckCircle2Icon />
          <AlertDescription>
            Đã liên kết Zalo. Lần sau bấm nút Zalo ở trang đăng nhập là vào thẳng.
          </AlertDescription>
        </Alert>
      )}

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
            Email và số CCCD do chủ trọ quản lý. Cần sửa thì báo chủ trọ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {profile && <OwnProfileForm profile={profile} />}

          {profile && (
            <div className="space-y-1 border-t border-border pt-5">
              <p className="text-sm text-muted-foreground">Số CCCD / CMND</p>
              <p className="font-mono">{profile.idNumber ?? "Chưa có"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {houseConfig.login.zalo && (
        <Card>
          <CardHeader>
            <CardTitle>Đăng nhập bằng Zalo</CardTitle>
            <CardDescription>
              Liên kết một lần, lần sau khỏi phải nhớ mật khẩu.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {profile?.zaloId ? (
              <div className="flex items-center gap-2">
                <Badge variant="success">
                  <ShieldCheckIcon />
                  Đã liên kết
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Bấm nút Zalo ở trang đăng nhập là vào được.
                </span>
              </div>
            ) : (
              <Button variant="outline" asChild className="w-full">
                {/* Link thường, không phải form: đây là điểm bắt đầu luồng OAuth,
                    không phải thao tác thay đổi dữ liệu. */}
                <Link href="/auth/zalo">
                  <LinkIcon />
                  Liên kết tài khoản Zalo
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

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
