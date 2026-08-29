import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/components/common/link";
import { ChevronRightIcon, DoorOpenIcon, ReceiptTextIcon, WifiIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InstallPrompt } from "@/components/common/install-prompt";
import { NoRoomNotice } from "@/components/common/no-room-notice";
import { TENANT_SECONDARY } from "@/components/layout/nav-items";
import { getMyTenancy, getMyWifi } from "@/features/tenants/queries";
import { getMyUnpaidInvoices } from "@/features/invoices/queries";
import { formatDate, formatDuration, formatMonthYear, formatVND } from "@/lib/format";
import { houseConfig } from "@/config/site";

export const metadata: Metadata = { title: "Trang chủ" };

// Cả trang phụ thuộc vào hợp đồng thuê (không có phòng thì thay bằng NoRoomNotice),
// nên không tách được phần tĩnh nào ra ngoài. Bọc trong <Suspense>: chuyển tab là
// khung xám hiện ngay, dữ liệu stream vào sau.
export const instant = true;

export default function TenantHomePage() {
  return (
    <div className="space-y-4">
      {/* Ngoài <Suspense>: lời mời cài app không đụng tới database nên nó thuộc
          phần tĩnh, hiện ngay chứ không đợi hợp đồng thuê tải xong. */}
      <InstallPrompt />

      <Suspense fallback={<HomeSkeleton />}>
        <TenantHome />
      </Suspense>
    </div>
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

/**
 * Hoá đơn chưa đóng, hiện ngay đầu trang chủ.
 *
 * Nằm cùng cây với TenantHome nên cũng stream trong <Suspense> của trang; không
 * có gì thì component trả về null và trang trông như trước.
 */
async function UnpaidInvoiceNotice() {
  const unpaid = await getMyUnpaidInvoices();
  if (unpaid.length === 0) return null;

  const total = unpaid.reduce((sum, invoice) => sum + invoice.total, 0);
  const soonest = unpaid.reduce(
    (earliest, invoice) =>
      invoice.dueDate && (!earliest || invoice.dueDate < earliest) ? invoice.dueDate : earliest,
    null as string | null,
  );

  return (
    <Link href="/me/invoices" className="block rounded-xl">
      <Card className="border-warning/30 bg-warning/10 transition-colors hover:border-warning/50">
        <CardContent className="flex items-center gap-3 p-4">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning-foreground dark:text-warning"
          >
            <ReceiptTextIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {unpaid.length === 1
                ? `Hoá đơn tháng ${formatMonthYear(unpaid[0].period)} chưa đóng`
                : `${unpaid.length} hoá đơn chưa đóng`}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatVND(total)}
              {soonest ? ` · hạn ${formatDate(soonest)}` : ""}
            </p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
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

      <UnpaidInvoiceNotice />

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

      {/* Thẻ wifi phía trên đã dẫn tới /me/wifi kèm tên mạng — bỏ mục trùng ở
          danh sách dưới để không có hai lối vào giống nhau cạnh nhau. */}
      {TENANT_SECONDARY.filter(
        (item) => !(primaryWifi && item.href === "/me/wifi"),
      ).map((item) => (
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
