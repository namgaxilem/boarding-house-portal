import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/components/common/link";
import { notFound } from "next/navigation";
import {
  AlertCircleIcon,
  LockIcon,
  LogInIcon,
  LogOutIcon,
  PencilIcon,
  Trash2Icon,
  UnlockIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { TenancyStatusBadge } from "@/components/common/status-badge";
import { ConfirmForm } from "@/components/common/confirm-form";
import { ResetTenantPasswordForm } from "@/features/tenants/components/reset-password-form";
import { GateCredentialForm } from "@/features/tenants/components/gate-credential-form";
import { deleteTenant, toggleTenantActive } from "@/features/tenants/actions";
import { db } from "@/lib/db";
import {
  formatDate,
  formatDuration,
  formatPhone,
  formatVND,
  initials,
} from "@/lib/format";

export async function generateMetadata(
  props: PageProps<"/admin/tenants/[tenantId]">,
): Promise<Metadata> {
  const { tenantId } = await props.params;
  const tenant = await db.getTenant(tenantId);
  return { title: tenant?.fullName ?? "Người thuê" };
}

// Tên người thuê xuất hiện khắp trang (tiêu đề, breadcrumb, các nút xác nhận) nên
// cả trang phụ thuộc dữ liệu; <Suspense> để khung trang hiện ngay khi điều hướng.
export const instant = true;

export default function TenantDetailPage(props: PageProps<"/admin/tenants/[tenantId]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TenantDetail {...props} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-20 w-full max-w-lg rounded-md" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

async function TenantDetail(props: PageProps<"/admin/tenants/[tenantId]">) {
  const { tenantId } = await props.params;
  const searchParams = await props.searchParams;

  const tenant = await db.getTenant(tenantId);
  if (!tenant) notFound();

  const [tenancies, gateCredential] = await Promise.all([
    db.listTenanciesByTenant(tenant.id),
    db.getGateCredential(tenant.id),
  ]);
  const error = typeof searchParams.error === "string" ? searchParams.error : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tenant.fullName}
        description={tenant.email}
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Người thuê", href: "/admin/tenants" },
          { label: tenant.fullName },
        ]}
        actions={
          <>
            {!tenant.currentTenancy && tenant.isActive && (
              <Button asChild>
                <Link href={`/admin/tenancies/new?tenantId=${tenant.id}`}>
                  <LogInIcon />
                  Xếp phòng
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/admin/tenants/${tenant.id}/edit`}>
                <PencilIcon />
                Sửa
              </Link>
            </Button>
            <ConfirmForm
              action={deleteTenant}
              hidden={{ tenantId: tenant.id }}
              title={`Xoá ${tenant.fullName}?`}
              description="Tài khoản đăng nhập và toàn bộ lịch sử thuê của người này sẽ mất. Nếu chỉ muốn ngăn đăng nhập, hãy khoá tài khoản thay vì xoá."
              triggerLabel={
                <>
                  <Trash2Icon />
                  Xoá
                </>
              }
              triggerProps={{ className: "text-destructive hover:bg-destructive/10" }}
            />
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {searchParams.created === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>
            Đã tạo tài khoản. Đưa email và mật khẩu tạm cho người thuê, nhắc họ đổi mật
            khẩu sau lần đăng nhập đầu.
          </AlertDescription>
        </Alert>
      )}

      {!tenant.isActive && (
        <Alert variant="warning">
          <LockIcon />
          <AlertDescription>
            Tài khoản đang bị khoá — người này không đăng nhập được.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="text-sm">
                    {initials(tenant.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{tenant.fullName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {tenant.email}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-y-3 border-t border-border pt-4 text-sm">
                <dt className="text-muted-foreground">Điện thoại</dt>
                <dd className="text-right tabular-nums">{formatPhone(tenant.phone)}</dd>

                <dt className="text-muted-foreground">CCCD / CMND</dt>
                <dd className="text-right font-mono text-xs">
                  {tenant.idNumber ?? "—"}
                </dd>

                <dt className="text-muted-foreground">Ngày sinh</dt>
                <dd className="text-right">{formatDate(tenant.dateOfBirth)}</dd>

                <dt className="text-muted-foreground">Quê quán</dt>
                <dd className="text-right">{tenant.hometown ?? "—"}</dd>

                <dt className="text-muted-foreground">Tạo lúc</dt>
                <dd className="text-right">{formatDate(tenant.createdAt)}</dd>

                <dt className="text-muted-foreground">Zalo</dt>
                <dd className="text-right">
                  {tenant.zaloId ? (
                    <Badge variant="success">Đã liên kết</Badge>
                  ) : (
                    <span className="text-muted-foreground">Chưa</span>
                  )}
                </dd>
              </dl>

              {tenant.note && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">Ghi chú riêng</p>
                  <p className="mt-1 text-sm">{tenant.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phòng hiện tại</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {tenant.currentRoom && tenant.currentTenancy ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/rooms/${tenant.currentRoom.id}`}
                      className="text-lg font-semibold underline-offset-4 hover:underline"
                    >
                      {tenant.currentRoom.code}
                    </Link>
                    {tenant.currentTenancy.isPrimary && (
                      <Badge variant="secondary">Đứng tên</Badge>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Từ ngày</dt>
                    <dd className="text-right">
                      {formatDate(tenant.currentTenancy.startDate)}
                    </dd>

                    <dt className="text-muted-foreground">Đã ở</dt>
                    <dd className="text-right">
                      {formatDuration(tenant.currentTenancy.startDate)}
                    </dd>

                    <dt className="text-muted-foreground">Giá thuê</dt>
                    <dd className="text-right tabular-nums">
                      {formatVND(tenant.currentTenancy.monthlyPrice)}
                    </dd>

                    <dt className="text-muted-foreground">Tiền cọc</dt>
                    <dd className="text-right tabular-nums">
                      {formatVND(tenant.currentTenancy.deposit)}
                    </dd>
                  </dl>

                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/admin/tenancies/${tenant.currentTenancy.id}/checkout`}>
                      <LogOutIcon />
                      Cho trả phòng
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa được xếp phòng nào.
                </p>
              )}
            </CardContent>
          </Card>

          <GateCredentialForm tenantId={tenant.id} credential={gateCredential} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử thuê</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {tenancies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có lịch sử thuê phòng.
                </p>
              ) : (
                <ol className="space-y-3">
                  {tenancies.map((tenancy) => (
                    <li
                      key={tenancy.id}
                      className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/rooms/${tenancy.roomId}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            Phòng {tenancy.room.code}
                          </Link>
                          <TenancyStatusBadge status={tenancy.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(tenancy.startDate)} →{" "}
                          {tenancy.endDate ? formatDate(tenancy.endDate) : "nay"} ·{" "}
                          {formatDuration(tenancy.startDate, tenancy.endDate)}
                          {tenancy.endReason && ` · ${tenancy.endReason}`}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {formatVND(tenancy.monthlyPrice)}/tháng
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tài khoản đăng nhập</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <ResetTenantPasswordForm tenantId={tenant.id} />

              <form
                action={toggleTenantActive}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"
              >
                <input type="hidden" name="tenantId" value={tenant.id} />
                <input
                  type="hidden"
                  name="isActive"
                  value={tenant.isActive ? "false" : "true"}
                />
                <div>
                  <p className="text-sm font-medium">
                    {tenant.isActive ? "Khoá tài khoản" : "Mở khoá tài khoản"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tenant.isActive
                      ? "Người này sẽ không đăng nhập được nữa, nhưng dữ liệu vẫn giữ."
                      : "Cho phép người này đăng nhập trở lại."}
                  </p>
                </div>
                <Button type="submit" variant="outline" size="sm">
                  {tenant.isActive ? <LockIcon /> : <UnlockIcon />}
                  {tenant.isActive ? "Khoá" : "Mở khoá"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
