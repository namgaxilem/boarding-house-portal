import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/components/common/link";
import { AlertCircleIcon, PlusIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { PeriodPicker } from "@/components/common/period-picker";
import { InvoiceTable } from "@/features/invoices/components/invoice-table";
import { GenerateInvoicesForm } from "@/features/invoices/components/invoice-status-actions";
import { listInvoices } from "@/features/invoices/queries";
import { INVOICE_STATUS_LABEL } from "@/lib/constants";
import { formatMonthYear, formatVND } from "@/lib/format";
import { currentPeriod, toPeriod } from "@/lib/period";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

export const metadata: Metadata = { title: "Hoá đơn" };

export const instant = true;

const STATUS_FILTERS: (InvoiceStatus | "all")[] = [
  "all",
  "draft",
  "issued",
  "paid",
  "void",
];

export default async function InvoicesPage(props: PageProps<"/admin/invoices">) {
  const searchParams = await props.searchParams;

  const period =
    toPeriod(typeof searchParams.period === "string" ? searchParams.period : null) ??
    currentPeriod();
  const status = readStatus(searchParams.status);
  // Tháng dùng để LẬP hoá đơn luôn có; lọc theo tháng thì tuỳ chọn, vì chủ trọ
  // hay cần xem "tất cả hoá đơn chưa thu" bất kể tháng nào.
  const filterByPeriod = searchParams.month === "1";
  // Lọc theo phòng chỉ tới từ link (trang báo cáo, trang chi tiết phòng), không
  // có nút bấm — chủ trọ 10 phòng nghĩ theo tháng, không theo phòng.
  const roomId = typeof searchParams.roomId === "string" ? searchParams.roomId : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hoá đơn"
        description="Tiền phòng, điện nước và dịch vụ theo từng tháng."
        breadcrumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Hoá đơn" }]}
        actions={
          <>
            <PeriodPicker period={period} />
            <Button asChild>
              <Link href={`/admin/invoices/new?period=${period}`}>
                <PlusIcon />
                Lập hoá đơn
              </Link>
            </Button>
          </>
        }
      />

      {typeof searchParams.error === "string" && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{searchParams.error}</AlertDescription>
        </Alert>
      )}

      {searchParams.deleted === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã xoá hoá đơn.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Lập nhanh cho cả nhà trọ</p>
            <p className="text-sm text-muted-foreground">
              Tạo hoá đơn nháp cho mọi phòng đang ở đã có chỉ số của tháng{" "}
              {formatMonthYear(period)}. Nháp — người thuê chưa thấy gì cho tới khi bạn
              phát hành.
            </p>
          </div>
          <GenerateInvoicesForm period={period} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((value) => (
          <FilterChip
            key={value}
            href={buildHref({ status: value, period, month: filterByPeriod })}
            active={status === value}
            label={value === "all" ? "Tất cả" : INVOICE_STATUS_LABEL[value]}
          />
        ))}

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <FilterChip
          href={buildHref({ status, period, month: !filterByPeriod })}
          active={filterByPeriod}
          label={`Chỉ tháng ${formatMonthYear(period)}`}
        />
      </div>

      <Suspense
        key={`${status}-${filterByPeriod ? period : "all"}-${roomId ?? "all"}`}
        fallback={<Skeleton className="h-72 w-full rounded-xl" />}
      >
        <InvoiceList
          status={status}
          period={filterByPeriod ? period : undefined}
          roomId={roomId}
        />
      </Suspense>
    </div>
  );
}

async function InvoiceList({
  status,
  period,
  roomId,
}: {
  status: InvoiceStatus | "all";
  period?: string;
  roomId?: string;
}) {
  const invoices = await listInvoices({ status, period, roomId });

  const unpaid = invoices.filter((invoice) => invoice.status === "issued");
  const unpaidTotal = unpaid.reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <div className="space-y-3">
      {unpaid.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {unpaid.length} hoá đơn chưa thu ·{" "}
          <strong className="text-foreground tabular-nums">{formatVND(unpaidTotal)}</strong>
        </p>
      )}
      <InvoiceTable invoices={invoices} />
    </div>
  );
}

function readStatus(value: unknown): InvoiceStatus | "all" {
  return typeof value === "string" &&
    (STATUS_FILTERS as string[]).includes(value)
    ? (value as InvoiceStatus | "all")
    : "all";
}

function buildHref({
  status,
  period,
  month,
}: {
  status: InvoiceStatus | "all";
  period: string;
  month: boolean;
}) {
  const params = new URLSearchParams({ period });
  if (status !== "all") params.set("status", status);
  if (month) params.set("month", "1");
  return `/admin/invoices?${params.toString()}`;
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary/40 bg-primary/10 font-medium text-primary"
          : "border-border text-muted-foreground hover:bg-secondary",
      )}
    >
      {label}
    </Link>
  );
}
