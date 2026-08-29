"use client";

import { useActionState, useState } from "react";
import { Link } from "@/components/common/link";
import { SaveIcon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { createInvoice, updateInvoice } from "@/features/invoices/actions";
import type { InvoiceDraft } from "@/features/invoices/queries";
import { formatMonthYear, formatVND } from "@/lib/format";
import { lineAmount, toMonthInputValue } from "@/lib/period";
import type { InvoiceDetail } from "@/types";

/**
 * Lập hoặc sửa hoá đơn.
 *
 * Tổng tiền hiện ngay khi gõ, nhưng con số đó CHỈ để xem: server tính lại từ số
 * lượng × đơn giá, và `invoices.total` là cột sinh trong database. Nếu hai bên có
 * lệch thì bên đúng là bên kia.
 */
export function InvoiceForm({
  draft,
  invoice,
}: {
  draft?: InvoiceDraft;
  invoice?: InvoiceDetail;
}) {
  const action = invoice ? updateInvoice.bind(null, invoice.id) : createInvoice;
  const [state, formAction] = useActionState(action, null);
  const errors = fieldErrorsOf(state);

  const period = invoice?.period ?? draft?.period ?? "";
  const roomCode = invoice?.room.code ?? draft?.room.code ?? "";

  const [rent, setRent] = useState(String(invoice?.rent ?? draft?.rent ?? 0));
  const [electricKwh, setElectricKwh] = useState(
    String(invoice?.electricKwh ?? draft?.electricKwh ?? 0),
  );
  const [electricPrice, setElectricPrice] = useState(
    String(invoice?.electricPrice ?? draft?.electricPrice ?? 0),
  );
  const [waterM3, setWaterM3] = useState(String(invoice?.waterM3 ?? draft?.waterM3 ?? 0));
  const [waterPrice, setWaterPrice] = useState(
    String(invoice?.waterPrice ?? draft?.waterPrice ?? 0),
  );
  const [serviceAmount, setServiceAmount] = useState(
    String(invoice?.serviceAmount ?? draft?.serviceAmount ?? 0),
  );
  const [otherAmount, setOtherAmount] = useState(String(invoice?.otherAmount ?? 0));
  const [discount, setDiscount] = useState(String(invoice?.discount ?? 0));

  const electricAmount = lineAmount(Number(electricKwh) || 0, Number(electricPrice) || 0);
  const waterAmount = lineAmount(Number(waterM3) || 0, Number(waterPrice) || 0);
  const total =
    (Number(rent) || 0) +
    electricAmount +
    waterAmount +
    (Number(serviceAmount) || 0) +
    (Number(otherAmount) || 0) -
    (Number(discount) || 0);

  const tenantId = invoice?.tenantId ?? draft?.tenantId ?? "";
  const tenantName = invoice?.tenant.fullName ?? draft?.tenantName ?? "";

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      {/* Phòng, người thuê và kỳ tính tiền không sửa trong form: đổi phòng nghĩa
          là một hoá đơn khác. Trang /admin/invoices/new có bộ chọn riêng cho
          việc đó. */}
      <input type="hidden" name="roomId" value={invoice?.roomId ?? draft?.room.id ?? ""} />
      <input type="hidden" name="tenantId" value={tenantId} />
      <input
        type="hidden"
        name="tenancyId"
        value={invoice?.tenancyId ?? draft?.tenancyId ?? ""}
      />
      <input
        type="hidden"
        name="readingId"
        value={invoice?.readingId ?? draft?.reading?.id ?? ""}
      />
      <input type="hidden" name="period" value={toMonthInputValue(period)} />

      <Card>
        <CardHeader>
          <CardTitle>
            Phòng {roomCode} · tháng {period ? formatMonthYear(period) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
            Người đứng tên hoá đơn: <strong>{tenantName || "—"}</strong>
          </div>

          <Field name="rent" label="Tiền phòng (đ)" required errors={errors}>
            <Input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={rent}
              onChange={(event) => setRent(event.target.value)}
              required
            />
          </Field>

          <Field
            name="serviceAmount"
            label="Phí dịch vụ (đ)"
            hint="Rác, gửi xe, internet…"
            required
            errors={errors}
          >
            <Input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={serviceAmount}
              onChange={(event) => setServiceAmount(event.target.value)}
              required
            />
          </Field>

          <Field
            name="electricKwh"
            label="Điện (kWh)"
            hint={
              draft?.reading
                ? `Từ chỉ số ${draft.reading.electricStart} → ${draft.reading.electricEnd}`
                : "Số kWh đã dùng trong tháng"
            }
            required
            errors={errors}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={electricKwh}
              onChange={(event) => setElectricKwh(event.target.value)}
              required
            />
          </Field>

          <Field name="electricPrice" label="Giá điện (đ/kWh)" required errors={errors}>
            <Input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={electricPrice}
              onChange={(event) => setElectricPrice(event.target.value)}
              required
            />
          </Field>

          <Field
            name="waterM3"
            label="Nước (m³)"
            hint={
              draft?.reading
                ? `Từ chỉ số ${draft.reading.waterStart} → ${draft.reading.waterEnd}`
                : "Số m³ đã dùng trong tháng"
            }
            required
            errors={errors}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={waterM3}
              onChange={(event) => setWaterM3(event.target.value)}
              required
            />
          </Field>

          <Field name="waterPrice" label="Giá nước (đ/m³)" required errors={errors}>
            <Input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={waterPrice}
              onChange={(event) => setWaterPrice(event.target.value)}
              required
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phát sinh, giảm trừ và hạn đóng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <Field name="otherAmount" label="Khoản phát sinh (đ)" errors={errors}>
            <Input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={otherAmount}
              onChange={(event) => setOtherAmount(event.target.value)}
            />
          </Field>

          <Field
            name="otherNote"
            label="Lý do phát sinh"
            hint="Bắt buộc nếu có khoản phát sinh."
            errors={errors}
          >
            <Input
              defaultValue={invoice?.otherNote ?? ""}
              placeholder="Ví dụ: thay vòi nước 120.000 đ"
            />
          </Field>

          <Field
            name="discount"
            label="Giảm trừ (đ)"
            hint="Ví dụ trả phòng giữa tháng, hoặc bù tiền sửa chữa."
            errors={errors}
          >
            <Input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </Field>

          <Field name="dueDate" label="Hạn đóng" errors={errors}>
            <Input type="date" defaultValue={invoice?.dueDate ?? draft?.dueDate ?? ""} />
          </Field>

          <Field name="note" label="Ghi chú trên hoá đơn" errors={errors} className="sm:col-span-2">
            <Textarea
              defaultValue={invoice?.note ?? ""}
              rows={2}
              placeholder="Người thuê đọc được ghi chú này."
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5 text-sm">
          <Row label="Tiền phòng" value={Number(rent) || 0} />
          <Row label={`Điện ${electricKwh || 0} kWh`} value={electricAmount} />
          <Row label={`Nước ${waterM3 || 0} m³`} value={waterAmount} />
          <Row label="Dịch vụ" value={Number(serviceAmount) || 0} />
          {(Number(otherAmount) || 0) > 0 && (
            <Row label="Phát sinh" value={Number(otherAmount) || 0} />
          )}
          {(Number(discount) || 0) > 0 && (
            <Row label="Giảm trừ" value={-(Number(discount) || 0)} />
          )}
          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Tổng cộng</span>
            <span className="tabular-nums">{formatVND(total)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={invoice ? `/admin/invoices/${invoice.id}` : "/admin/invoices"}>
            Huỷ
          </Link>
        </Button>

        <SubmitButton name="intent" value="draft" variant={invoice ? "default" : "outline"}>
          <SaveIcon />
          {invoice ? "Lưu thay đổi" : "Lưu nháp"}
        </SubmitButton>

        {/* Chỉ khi lập mới: hoá đơn đang sửa đã có nút phát hành ở trang chi tiết. */}
        {!invoice && (
          <SubmitButton name="intent" value="issue" pendingText="Đang gửi…">
            <SendIcon />
            Lưu và phát hành
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{formatVND(value)}</span>
    </div>
  );
}
