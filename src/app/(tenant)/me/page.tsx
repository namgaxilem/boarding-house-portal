import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, DoorOpenIcon, WifiIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoRoomNotice } from "@/components/common/no-room-notice";
import { TENANT_SECONDARY } from "@/components/layout/nav-items";
import { getMyTenancy, getMyWifi } from "@/features/tenants/queries";
import { formatDate, formatDuration, formatVND } from "@/lib/format";
import { houseConfig } from "@/config/site";

export const metadata: Metadata = { title: "Trang chủ" };

// Cả trang phụ thuộc vào hợp đồng thuê (không có phòng thì thay bằng NoRoomNotice),
// nên không tách được phần tĩnh nào ra ngoài. Bọc trong <Suspense>: chuyển tab là
// khung xám hiện ngay, dữ liệu stream vào sau.
export const instant = true;

export default function TenantHomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <TenantHome />
    </Suspense>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-[196px] w-full rounded-xl" />
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[72px] w-full rounded-xl" />
      ))}
    </div>
  );
}

async function TenantHome() {
  const tenancy = await getMyTenancy();

  if (!tenancy) {
    return <NoRoomNotice />;
  }

  const wifi = await getMyWifi();
  const primaryWifi = wifi[0];

  return (
    <div className="space-y-4">
      {/* Room card — the one thing a tenant opens the app to see. */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-accent/60 to-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Phòng của bạn</p>
              <p className="text-3xl font-bold tracking-tight">{tenancy.room.code}</p>
            </div>
            {tenancy.isPrimary && <Badge variant="secondary">Đứng tên</Badge>}
          </div>

          <dl className="grid grid-cols-2 gap-y-3 border-t border-border/60 pt-4 text-sm">
            <dt className="text-muted-foreground">Tiền phòng</dt>
            <dd className="text-right font-semibold tabular-nums">
              {formatVND(tenancy.monthlyPrice)}
            </dd>

            <dt className="text-muted-foreground">Ở từ</dt>
            <dd className="text-right">{formatDate(tenancy.startDate)}</dd>

            <dt className="text-muted-foreground">Đã ở</dt>
            <dd className="text-right">{formatDuration(tenancy.startDate)}</dd>
          </dl>
        </CardContent>
      </Card>

      {primaryWifi && (
        <Link href="/me/wifi" className="block rounded-xl">
          <Card className="transition-colors hover:border-primary/40 hover:bg-accent/30">
            <CardContent className="flex items-center gap-3 p-4">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info/12 text-info"
              >
                <WifiIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{primaryWifi.ssid}</p>
                <p className="text-sm text-muted-foreground">Xem mật khẩu wifi</p>
              </div>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      <Link href="/me/room" className="block rounded-xl">
        <Card className="transition-colors hover:border-primary/40 hover:bg-accent/30">
          <CardContent className="flex items-center gap-3 p-4">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"
            >
              <DoorOpenIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Chi tiết phòng</p>
              <p className="text-sm text-muted-foreground">
                Diện tích, đơn giá điện nước, người ở cùng
              </p>
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {TENANT_SECONDARY.map((item) => (
        <Link key={item.href} href={item.href} className="block rounded-xl">
          <Card className="transition-colors hover:border-primary/40 hover:bg-accent/30">
            <CardContent className="flex items-center gap-3 p-4">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"
              >
                <item.icon className="size-5" />
              </span>
              <p className="flex-1 font-medium">{item.label}</p>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}

      <p className="px-1 pt-2 text-center text-xs text-muted-foreground">
        {houseConfig.name} · {houseConfig.contact.phone}
      </p>
    </div>
  );
}
