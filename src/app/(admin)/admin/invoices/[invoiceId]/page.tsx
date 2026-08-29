import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/components/common/link";
import { notFound } from "next/navigation";
import {
  AlertCircleIcon,
  BanIcon,
  GaugeIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmForm } from "@/components/common/confirm-form";
import {
  InvoiceLines,
  InvoicePaymentInfo,
} from "@/features/invoices/components/invoice-lines";
import { PrintButton } from "@/features/invoices/components/invoice-print";
import {
  InvoicePrintFooter,
  InvoicePrintHeader,
} from "@/features/invoices/components/invoice-print-header";
import { MarkPaidForm } from "@/features/invoices/components/invoice-status-actions";
import { deleteInvoice, issueInvoice, voidInvoice } from "@/features/invoices/actions";
import { db } from "@/lib/db";
import { formatDate, formatMonthYear, formatPhone } from "@/lib/format";

export async function generateMetadata(
  props: PageProps<"/admin/invoices/[invoiceId]">,
): Promise<Metadata> {
  const { invoiceId } = await props.params;
  const invoice = await db.getInvoice(invoiceId);
  return {
    title: invoice
      ? `Hoá đơn ${invoice.room.code} · ${formatMonthYear(invoice.period)}`
      : "Hoá đơn",
  };
}

export const instant = true;

export default function InvoiceDetailPage(
  props: PageProps<"/admin/invoices/[invoiceId]">,
) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <InvoiceDetailView {...props} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-20 w-full max-w-lg rounded-md" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

async function InvoiceDetailView(props: PageProps<"/admin/invoices/[invoiceId]">) {
  const { invoiceId } = await props.params;
  const searchParams = await props.searchParams;

  const invoice = await db.getInvoice(invoiceId);
  if (!invoice) notFound();

  const period = formatMonthYear(invoice.period);
  const editable = invoice.status === "draft" || invoice.status === "issued";

  return (
    <div className="space-y-6">
      {/* Khung màn hình biến mất khi in; tờ giấy có đầu trang riêng bên dưới. */}
      <div className="print:hidden">
      <PageHeader
        title={`Hoá đơn phòng ${invoice.room.code}`}
        description={`Tháng ${period} · ${invoice.tenant.fullName}`}
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Hoá đơn", href: "/admin/invoices" },
          { label: `${invoice.room.code} · ${period}` },
        ]}
        actions={
          <>
            <PrintButton />

            {invoice.status === "draft" && (
              <form action={issueInvoice}>
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <Button type="submit">
                  <SendIcon />
                  Phát hành
                </Button>
              </form>
            )}

            {editable && (
              <Button variant="outline" asChild>
                <Link href={`/admin/invoices/${invoice.id}/edit`}>
                  <PencilIcon />
                  Sửa
                </Link>
              </Button>
            )}

            {invoice.status !== "void" && invoice.status !== "paid" && (
              <ConfirmForm
                action={voidInvoice}
                hidden={{ invoiceId: invoice.id }}
                title={`Huỷ hoá đơn ${invoice.room.code} tháng ${period}?`}
                description="Hoá đơn vẫn nằm trong danh sách với trạng thái đã huỷ, và bạn lập lại được hoá đơn mới cho tháng này."
                confirmLabel="Huỷ hoá đơn"
                triggerLabel={
                  <>
                    <BanIcon />
                    Huỷ
                  </>
                }
              />
            )}

            {(invoice.status === "draft" || invoice.status === "void") && (
              <ConfirmForm
                action={deleteInvoice}
                hidden={{ invoiceId: invoice.id }}
                title="Xoá hẳn hoá đơn này?"
                description="Không còn dấu vết nào. Chỉ nên xoá hoá đơn nháp lập thử."
                triggerLabel={
                  <>
                    <Trash2Icon />
                    Xoá
                  </>
                }
                triggerProps={{ className: "text-destructive hover:bg-destructive/10" }}
              />
            )}
          </>
        }
      />
      </div>

      {typeof searchParams.error === "string" && (
        <Alert variant="destructive" className="print:hidden">
          <AlertCircleIcon />
          <AlertDescription>{searchParams.error}</AlertDescription>
        </Alert>
      )}

      {searchParams.issued === "1" && (
        <Alert variant="success" role="status" className="print:hidden">
          <AlertDescription>
            Đã phát hành. Người thuê nhận được thông báo trong app, và email nếu hệ thống
            email đã được cấu hình.
          </AlertDescription>
        </Alert>
      )}

      {searchParams.updated === "1" && (
        <Alert variant="success" role="status" className="print:hidden">
          <AlertDescription>Đã lưu thay đổi.</AlertDescription>
        </Alert>
      )}

      {searchParams.voided === "1" && (
        <Alert variant="warning" className="print:hidden">
          <AlertDescription>
            Hoá đơn đã huỷ. Lập lại hoá đơn mới cho tháng này nếu cần.
          </AlertDescription>
        </Alert>
      )}

      {invoice.status === "draft" && (
        <Alert variant="warning" className="print:hidden">
          <AlertDescription>
            Đang là nháp — người thuê chưa thấy hoá đơn này. Bấm “Phát hành” để gửi.
          </AlertDescription>
        </Alert>
      )}

      <InvoicePrintHeader invoice={invoice} />

      <div className="grid gap-6 lg:grid-cols-3 print:block">
        <div className="space-y-6 lg:col-span-2 print-keep">
          <InvoiceLines invoice={invoice} />

          {/* Thông tin chuyển khoản cũng nằm ở BẢN CỦA CHỦ TRỌ.
              Tờ giấy chủ trọ in ra là tờ đưa cho người thuê — thiếu số tài khoản
              và ảnh QR thì họ cầm về vẫn phải mở app ra tra, và cả việc in mất
              nghĩa. Component tự ẩn với hoá đơn đã thu. */}
          <InvoicePaymentInfo invoice={invoice} />

          <InvoicePrintFooter />
        </div>

        <div className="space-y-6 print:hidden">
          {invoice.status === "issued" && <MarkPaidForm invoice={invoice} />}

          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              <p className="font-semibold">Liên quan</p>

              <dl className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Người thuê</dt>
                  <dd className="text-right">
                    <Link
                      href={`/admin/tenants/${invoice.tenant.id}`}
                      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                    >
                      <UserIcon className="size-3.5" />
                      {invoice.tenant.fullName}
                    </Link>
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Điện thoại</dt>
                  <dd className="tabular-nums">{formatPhone(invoice.tenant.phone)}</dd>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Phòng</dt>
                  <dd>
                    <Link
                      href={`/admin/rooms/${invoice.roomId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {invoice.room.code}
                    </Link>
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Chỉ số nguồn</dt>
                  <dd>
                    {invoice.readingId ? (
                      <Link
                        href={`/admin/meters?period=${invoice.period}`}
                        className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                      >
                        <GaugeIcon className="size-3.5" />
                        Tháng {period}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Nhập tay</span>
                    )}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Lập lúc</dt>
                  <dd>{formatDate(invoice.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
