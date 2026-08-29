import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/components/common/link";
import { ChevronRightIcon, ReceiptTextIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-lines";
import { listMyInvoices } from "@/features/invoices/queries";
import { formatDate, formatMonthYear, formatVND } from "@/lib/format";

export const metadata: Metadata = { title: "Hoá đơn của tôi" };

export const instant = true;

export default function MyInvoicesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Hoá đơn"
        description="Tiền phòng, điện nước và dịch vụ từng tháng."
      />

      <Suspense fallback={<ListSkeleton />}>
        <MyInvoices />
      </Suspense>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-[84px] w-full rounded-xl" />
      ))}
    </div>
  );
}

async function MyInvoices() {
  const invoices = await listMyInvoices();

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptTextIcon />}
        title="Chưa có hoá đơn nào"
        description="Khi chủ trọ phát hành hoá đơn, bạn sẽ nhận thông báo trong app và email."
      />
    );
  }

  const unpaid = invoices.filter((invoice) => invoice.status === "issued");
  const unpaidTotal = unpaid.reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <div className="space-y-3">
      {unpaid.length > 0 && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="p-4 text-sm">
            <p className="font-medium">
              {unpaid.length} hoá đơn chưa đóng · {formatVND(unpaidTotal)}
            </p>
            <p className="text-muted-foreground">
              Mở hoá đơn để xem thông tin chuyển khoản.
            </p>
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <Link href={`/me/invoices/${invoice.id}`} className="block rounded-xl">
              <Card className="transition-colors hover:border-primary/40 hover:bg-accent/30">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        Tháng {formatMonthYear(invoice.period)}
                      </p>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatVND(invoice.total)}
                      {invoice.status === "issued" && invoice.dueDate
                        ? ` · hạn ${formatDate(invoice.dueDate)}`
                        : ""}
                    </p>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
