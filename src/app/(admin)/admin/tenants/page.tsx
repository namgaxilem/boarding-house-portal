import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, UsersIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { listTenants } from "@/features/tenants/queries";
import { formatDate, formatPhone, formatVND, initials } from "@/lib/format";

export const metadata: Metadata = { title: "Người thuê" };

export const instant = true;

export default function AdminTenantsPage(props: PageProps<"/admin/tenants">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Người thuê"
        description={
          <Suspense fallback="Danh sách người thuê của nhà trọ.">
            <TenantCounts />
          </Suspense>
        }
        breadcrumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Người thuê" }]}
        actions={
          <Button asChild>
            <Link href="/admin/tenants/new">
              <PlusIcon />
              Thêm người thuê
            </Link>
          </Button>
        }
      />

      <Suspense fallback={null}>
        <DeletedNotice searchParams={props.searchParams} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <TenantTable />
      </Suspense>
    </div>
  );
}

async function TenantCounts() {
  const tenants = await listTenants();

  const active = tenants.filter((tenant) => tenant.currentTenancy !== null);
  const inactive = tenants.filter((tenant) => tenant.currentTenancy === null);

  return (
    <>
      {active.length} người đang ở · {inactive.length} người đã rời hoặc chưa xếp phòng.
    </>
  );
}

async function DeletedNotice({
  searchParams,
}: Pick<PageProps<"/admin/tenants">, "searchParams">) {
  const { deleted } = await searchParams;
  if (deleted !== "1") return null;

  return (
    <Alert variant="success" role="status">
      <AlertDescription>Đã xoá người thuê.</AlertDescription>
    </Alert>
  );
}

async function TenantTable() {
  const tenants = await listTenants();

  return (
    <>
      {tenants.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title="Chưa có người thuê nào"
          description="Tạo tài khoản để người thuê đăng nhập xem thông tin phòng của mình."
          action={
            <Button asChild>
              <Link href="/admin/tenants/new">
                <PlusIcon />
                Thêm người thuê
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên</TableHead>
                <TableHead className="hidden sm:table-cell">Điện thoại</TableHead>
                <TableHead>Phòng</TableHead>
                <TableHead className="hidden lg:table-cell">Từ ngày</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Giá thuê</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback>{initials(tenant.fullName)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {tenant.fullName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {tenant.email}
                        </span>
                      </span>
                    </Link>
                  </TableCell>

                  <TableCell className="hidden whitespace-nowrap tabular-nums text-muted-foreground sm:table-cell">
                    {formatPhone(tenant.phone)}
                  </TableCell>

                  <TableCell>
                    {tenant.currentRoom ? (
                      <Link
                        href={`/admin/rooms/${tenant.currentRoom.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {tenant.currentRoom.code}
                      </Link>
                    ) : tenant.isActive ? (
                      <Badge variant="secondary">Chưa xếp phòng</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Đã khoá
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                    {tenant.currentTenancy
                      ? formatDate(tenant.currentTenancy.startDate)
                      : "—"}
                  </TableCell>

                  <TableCell className="hidden whitespace-nowrap text-right tabular-nums text-muted-foreground lg:table-cell">
                    {tenant.currentTenancy
                      ? formatVND(tenant.currentTenancy.monthlyPrice)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
