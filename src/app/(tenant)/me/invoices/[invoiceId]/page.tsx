import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import {
  InvoiceLines,
  InvoicePaymentInfo,
} from "@/features/invoices/components/invoice-lines";
import { PrintButton } from "@/features/invoices/components/invoice-print";
import {
  InvoicePrintFooter,
  InvoicePrintHeader,
} from "@/features/invoices/components/invoice-print-header";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatMonthYear } from "@/lib/format";

export const metadata: Metadata = { title: "Chi tiết hoá đơn" };

export const instant = true;

export default function MyInvoiceDetailPage(
  props: PageProps<"/me/invoices/[invoiceId]">,
) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <MyInvoiceDetail {...props} />
    </Suspense>
  );
}

async function MyInvoiceDetail(props: PageProps<"/me/invoices/[invoiceId]">) {
  const { invoiceId } = await props.params;
  const user = await requireUser();

  const invoice = await db.getInvoice(invoiceId);

  // RLS đã chặn hoá đơn của người khác (và cả hoá đơn nháp). Kiểm thêm ở đây để
  // chủ trọ mở link của người thuê trong khu /me cũng không thấy hoá đơn phòng
  // khác — RLS cho admin đọc tất cả, guard này mới là thứ giữ đúng ngữ cảnh trang.
  if (!invoice || invoice.tenantId !== user.id || invoice.status === "draft") {
    notFound();
  }

  return (
    <div className="space-y-4">
      {/* Tiêu đề màn hình và tiêu đề bản in loại trừ nhau: tờ giấy cần tên nhà
          trọ, địa chỉ và mã hoá đơn — những thứ trên màn hình đã nằm ở thanh bên
          và trên URL. */}
      <div className="print:hidden">
        <PageHeader
          title={`Hoá đơn tháng ${formatMonthYear(invoice.period)}`}
          description={`Phòng ${invoice.room.code}`}
          actions={<PrintButton size="sm" />}
        />
      </div>

      <InvoicePrintHeader invoice={invoice} />

      <div className="print-keep">
        <InvoiceLines invoice={invoice} />
      </div>

      {/* Phần chuyển khoản có ảnh QR — in ra vẫn quét được, nên giữ lại. */}
      <div className="print-keep">
        <InvoicePaymentInfo invoice={invoice} />
      </div>

      <InvoicePrintFooter />
    </div>
  );
}
