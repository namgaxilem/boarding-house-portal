import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";
import { db } from "@/lib/db";
import { formatMonthYear } from "@/lib/format";

export const metadata: Metadata = { title: "Sửa hoá đơn" };

export const instant = true;

export default function EditInvoicePage(
  props: PageProps<"/admin/invoices/[invoiceId]/edit">,
) {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-xl" />}>
      <EditInvoice {...props} />
    </Suspense>
  );
}

async function EditInvoice(props: PageProps<"/admin/invoices/[invoiceId]/edit">) {
  const { invoiceId } = await props.params;

  const invoice = await db.getInvoice(invoiceId);
  if (!invoice) notFound();

  // Đã thu hoặc đã huỷ thì không sửa. Chặn ở đây để không ai mở được form rồi
  // gõ hai phút và nhận lỗi lúc bấm lưu — Server Action cũng chặn lần nữa.
  if (invoice.status === "paid" || invoice.status === "void") {
    redirect(`/admin/invoices/${invoice.id}`);
  }

  const period = formatMonthYear(invoice.period);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sửa hoá đơn ${invoice.room.code}`}
        description={`Tháng ${period}. ${
          invoice.status === "issued"
            ? "Hoá đơn đã phát hành — người thuê sẽ thấy số mới ngay khi lưu."
            : "Hoá đơn còn là nháp, người thuê chưa thấy gì."
        }`}
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Hoá đơn", href: "/admin/invoices" },
          { label: `${invoice.room.code} · ${period}`, href: `/admin/invoices/${invoice.id}` },
          { label: "Sửa" },
        ]}
      />

      <InvoiceForm invoice={invoice} />
    </div>
  );
}
