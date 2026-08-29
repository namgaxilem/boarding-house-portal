"use client";

import { useActionState } from "react";
import { BanknoteIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { generateMonthlyInvoices, markInvoicePaid } from "@/features/invoices/actions";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { formatMonthYear, formatVND } from "@/lib/format";
import type { InvoiceDetail } from "@/types";

/**
 * Ghi nhận đã thu tiền.
 *
 * Hình thức thanh toán là bắt buộc, không có mặc định: "tiền mặt" mặc định sẽ
 * được bấm qua trong một giây và ba tháng sau không ai đối chiếu được sao kê.
 */
export function MarkPaidForm({ invoice }: { invoice: InvoiceDetail }) {
  const [state, formAction] = useActionState(markInvoicePaid, null);
  const errors = fieldErrorsOf(state);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="font-semibold">Ghi nhận thanh toán</p>
          <p className="text-sm text-muted-foreground">
            Người thuê nhận thông báo trong app và email xác nhận đã nộp{" "}
            {formatVND(invoice.total)}.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <FormMessage state={state} />
          <input type="hidden" name="invoiceId" value={invoice.id} />

          <Field name="paidMethod" label="Hình thức" required errors={errors}>
            <Select name="paidMethod">
              <SelectTrigger>
                <SelectValue placeholder="Chọn hình thức" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <SubmitButton className="w-full" pendingText="Đang ghi nhận…">
            <BanknoteIcon />
            Đã thu tiền
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Lập hoá đơn nháp cho cả nhà trọ trong một tháng.
 *
 * Kết quả trả về là một câu văn, không phải con số: chủ trọ cần biết phòng nào bị
 * bỏ qua vì chưa ghi chỉ số, chứ "đã lập 7 hoá đơn" thì đúng mà vô dụng.
 */
export function GenerateInvoicesForm({ period }: { period: string }) {
  const [state, formAction] = useActionState(generateMonthlyInvoices, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="period" value={period} />
      <SubmitButton variant="outline" pendingText="Đang lập…">
        Lập hoá đơn nháp tháng {formatMonthYear(period)}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
