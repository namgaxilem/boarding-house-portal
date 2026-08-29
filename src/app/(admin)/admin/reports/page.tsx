import { Suspense } from "react";
import type { Metadata } from "next";
import {
  BanknoteIcon,
  ChartColumnIcon,
  DropletIcon,
  ReceiptTextIcon,
  ZapIcon,
} from "lucide-react";

import { Link } from "@/components/common/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { RevenueChart } from "@/features/dashboard/components/revenue-chart";
import { getRevenueReport } from "@/features/dashboard/queries";
import { formatCompactVND, formatMonthYear, formatNumber, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Báo cáo" };

export const instant = true;

const RANGES = [6, 12, 24];

function readMonths(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return RANGES.includes(parsed) ? parsed : 12;
}

export default async function ReportsPage(props: PageProps<"/admin/reports">) {
  const searchParams = await props.searchParams;
  const months = readMonths(searchParams.months);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo doanh thu"
        description="Tính từ hoá đơn đã phát hành. Nháp và hoá đơn đã huỷ không tính."
        breadcrumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Báo cáo" }]}
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            {RANGES.map((value) => (
              <Link
                key={value}
                href={`/admin/reports?months=${value}`}
                aria-current={months === value ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  months === value
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value} tháng
              </Link>
            ))}
          </div>
        }
      />

      <Suspense key={months} fallback={<ReportSkeleton />}>
        <Report months={months} />
      </Suspense>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[74px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

async function Report({ months }: { months: number }) {
  const report = await getRevenueReport(months);
  const { totals } = report;

  if (totals.invoiceCount === 0) {
    return (
      <EmptyState
        icon={<ChartColumnIcon />}
        title="Chưa có hoá đơn nào trong khoảng này"
        description="Báo cáo dựng từ hoá đơn đã phát hành. Lập và phát hành hoá đơn tháng đầu tiên rồi quay lại đây."
      />
    );
  }

  const collectRate = totals.billed === 0 ? 0 : totals.collected / totals.billed;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Đã lập"
          value={formatCompactVND(totals.billed)}
          sublabel={`${totals.invoiceCount} hoá đơn · ${formatVND(totals.billed)}`}
          icon={<ReceiptTextIcon />}
        />
        <StatCard
          label="Đã thu"
          value={formatCompactVND(totals.collected)}
          sublabel={`Thu được ${Math.round(collectRate * 100)}%`}
          icon={<BanknoteIcon />}
          accent="success"
        />
        <StatCard
          label="Còn nợ"
          value={formatCompactVND(totals.outstanding)}
          sublabel={
            totals.outstanding > 0 ? formatVND(totals.outstanding) : "Đã thu hết"
          }
          icon={<ReceiptTextIcon />}
          accent={totals.outstanding > 0 ? "warning" : "success"}
          href="/admin/invoices?status=issued"
        />
        <StatCard
          label="Điện · nước"
          value={`${formatNumber(Math.round(totals.electricKwh))} kWh`}
          sublabel={`${formatNumber(Math.round(totals.waterM3))} m³ nước`}
          icon={<ZapIcon />}
          accent="info"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theo tháng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <RevenueChart periods={report.periods} />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tháng</TableHead>
                  <TableHead className="text-right">Hoá đơn</TableHead>
                  <TableHead className="text-right">Đã lập</TableHead>
                  <TableHead className="text-right">Đã thu</TableHead>
                  <TableHead className="text-right">Còn nợ</TableHead>
                  <TableHead className="text-right">Điện</TableHead>
                  <TableHead className="text-right">Nước</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Mới nhất lên đầu ở BẢNG, còn biểu đồ chạy theo thời gian từ
                    trái sang. Hai thứ đọc theo hai kiểu: bảng để tra tháng vừa
                    rồi, biểu đồ để nhìn xu hướng. */}
                {[...report.periods].reverse().map((entry) => (
                  <TableRow key={entry.period}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/invoices?period=${entry.period}&month=1&status=all`}
                        className="underline-offset-4 hover:underline"
                      >
                        {formatMonthYear(entry.period)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.paidCount}/{entry.invoiceCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(entry.billed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      {formatNumber(entry.collected)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        entry.outstanding > 0 && "font-medium text-warning-foreground dark:text-warning",
                      )}
                    >
                      {entry.outstanding > 0 ? formatNumber(entry.outstanding) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNumber(Math.round(entry.electricKwh))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNumber(Math.round(entry.waterM3))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Số tiền tính bằng đồng. Tháng đang chạy dở luôn thấp vì hoá đơn chưa lập
            xong — đó không phải một tháng sụt giảm.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theo phòng</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phòng</TableHead>
                  <TableHead className="text-right">Hoá đơn</TableHead>
                  <TableHead className="text-right">Đã lập</TableHead>
                  <TableHead className="text-right">Đã thu</TableHead>
                  <TableHead className="text-right">Còn nợ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rooms.map((room) => (
                  <TableRow key={room.roomId}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/invoices?roomId=${room.roomId}&status=all`}
                        className="underline-offset-4 hover:underline"
                      >
                        {room.roomCode}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {room.invoiceCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(room.billed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      {formatNumber(room.collected)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        room.outstanding > 0 && "font-medium text-warning-foreground dark:text-warning",
                      )}
                    >
                      {room.outstanding > 0 ? formatNumber(room.outstanding) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <DropletIcon className="size-3.5" />
            Phòng nào nước cao bất thường nhiều tháng liền thường là rò ống, không phải
            dùng nhiều — xem cột nước ở bảng trên.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
