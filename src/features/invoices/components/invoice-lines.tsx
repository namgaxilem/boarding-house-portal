import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentMethods } from "@/features/payments/components/payment-methods";
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_STYLE, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatDate, formatDateTime, formatMonthYear, formatNumber, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvoiceDetail } from "@/types";

/**
 * Bảng chi tiết một hoá đơn — dùng chung cho cả chủ trọ và người thuê.
 *
 * Một component cho hai bên là cố ý: nếu mỗi bên tự dựng bảng riêng thì sớm muộn
 * hai bên hiển thị hai con số khác nhau cho cùng một hoá đơn, và người thuê là
 * bên tin vào con số họ nhìn thấy.
 */
export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceDetail["status"];
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(INVOICE_STATUS_STYLE[status], className)}>
      {INVOICE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function InvoiceLines({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">
            Phòng {invoice.room.code} · tháng {formatMonthYear(invoice.period)}
          </p>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <dl className="space-y-2 border-t border-border pt-3">
          <Line label="Tiền phòng" value={invoice.rent} />
          <Line
            label={`Điện · ${formatNumber(invoice.electricKwh)} kWh × ${formatVND(invoice.electricPrice)}`}
            value={invoice.electricAmount}
          />
          <Line
            label={`Nước · ${formatNumber(invoice.waterM3)} m³ × ${formatVND(invoice.waterPrice)}`}
            value={invoice.waterAmount}
          />
          <Line label="Dịch vụ" value={invoice.serviceAmount} />
          {invoice.otherAmount > 0 && (
            <Line
              label={`Phát sinh${invoice.otherNote ? ` · ${invoice.otherNote}` : ""}`}
              value={invoice.otherAmount}
            />
          )}
          {invoice.discount > 0 && <Line label="Giảm trừ" value={-invoice.discount} />}

          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
            <dt>Tổng cộng</dt>
            <dd className="tabular-nums">{formatVND(invoice.total)}</dd>
          </div>
        </dl>

        <dl className="grid grid-cols-2 gap-y-2 border-t border-border pt-3 text-sm">
          <dt className="text-muted-foreground">Hạn đóng</dt>
          <dd className="text-right">{formatDate(invoice.dueDate)}</dd>

          {invoice.issuedAt && (
            <>
              <dt className="text-muted-foreground">Phát hành</dt>
              <dd className="text-right">{formatDateTime(invoice.issuedAt)}</dd>
            </>
          )}

          {invoice.paidAt && (
            <>
              <dt className="text-muted-foreground">Đã thu</dt>
              <dd className="text-right">
                {formatDateTime(invoice.paidAt)}
                {invoice.paidMethod && ` · ${PAYMENT_METHOD_LABEL[invoice.paidMethod]}`}
              </dd>
            </>
          )}
        </dl>

        {invoice.note && (
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">Ghi chú</p>
            <p className="mt-1">{invoice.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Thông tin chuyển khoản, chỉ hiện với hoá đơn chưa thu.
 *
 * Hoá đơn đã thu mà vẫn khoe số tài khoản là mời người ta chuyển lần thứ hai.
 *
 * Số tài khoản và ảnh QR đọc từ database (`/admin/settings/payments`), không đọc
 * từ `site.ts` nữa — chủ trọ đổi ngân hàng không nên cần một lần deploy. File cấu
 * hình vẫn là đường lui khi chưa có thẻ nào; xem `listPaymentAccountsForDisplay`.
 */
export function InvoicePaymentInfo({ invoice }: { invoice: InvoiceDetail }) {
  if (invoice.status !== "issued") return null;

  return (
    <PaymentMethods
      amount={invoice.total}
      transferNote={`${invoice.room.code} ${formatMonthYear(invoice.period)}`}
      footer={
        <p className="text-xs text-muted-foreground">
          Chuyển xong thì nhắn cho chủ trọ; hoá đơn chuyển sang “Đã thu” khi chủ trọ
          đối chiếu sao kê.
        </p>
      }
    />
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="shrink-0 tabular-nums">{formatVND(value)}</dd>
    </div>
  );
}
