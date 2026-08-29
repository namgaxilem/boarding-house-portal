"use client";

import { Link } from "@/components/common/link";
import { useActionState, useState } from "react";
import { AlertCircleIcon, LogOutIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { checkOut } from "@/features/tenancies/actions";
import { END_REASON_OPTIONS } from "@/lib/constants";
import { formatDate, formatVND } from "@/lib/format";
import type { TenancyDetail } from "@/types";

const OTHER = "Lý do khác";

export function CheckOutForm({
  tenancy,
  today,
  unpaidTotal = 0,
}: {
  tenancy: TenancyDetail;
  today: string;
  /** Tổng hoá đơn đã phát hành mà chưa thu của người này. */
  unpaidTotal?: number;
}) {
  const [state, formAction] = useActionState(checkOut, null);
  const errors = fieldErrorsOf(state);

  const [reason, setReason] = useState(END_REASON_OPTIONS[0]);
  const [terminated, setTerminated] = useState(false);

  // Số trừ điền sẵn bằng phần còn nợ, nhưng KHÔNG quá số cọc đang giữ: phần vượt
  // quá cọc là một khoản nợ, phải đi vào hoá đơn chứ không phải âm tiền cọc.
  const [deduction, setDeduction] = useState(Math.min(unpaidTotal, tenancy.deposit));

  const parsedDeduction = Number.isFinite(deduction) ? Math.max(0, deduction) : 0;
  const overDeposit = parsedDeduction > tenancy.deposit;
  const refund = Math.max(0, tenancy.deposit - parsedDeduction);
  const stillOwed = Math.max(0, unpaidTotal - parsedDeduction);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="tenancyId" value={tenancy.id} />

      <FormMessage state={state} />

      <Card>
        <CardHeader>
          <CardTitle>Hợp đồng đang kết thúc</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Người thuê</dt>
            <dd className="text-right font-medium">{tenancy.tenant.fullName}</dd>

            <dt className="text-muted-foreground">Phòng</dt>
            <dd className="text-right font-medium">{tenancy.room.code}</dd>

            <dt className="text-muted-foreground">Ngày nhận phòng</dt>
            <dd className="text-right">{formatDate(tenancy.startDate)}</dd>

            <dt className="text-muted-foreground">Giá thuê</dt>
            <dd className="text-right tabular-nums">
              {formatVND(tenancy.monthlyPrice)}
            </dd>

            <dt className="text-muted-foreground">Tiền cọc đang giữ</dt>
            <dd className="text-right font-medium tabular-nums">
              {formatVND(tenancy.deposit)}
            </dd>
          </dl>
        </CardContent>
      </Card>

      {unpaidTotal > 0 && (
        <Alert variant="warning">
          <AlertCircleIcon />
          <AlertDescription>
            Người này còn <strong>{formatVND(unpaidTotal)}</strong> hoá đơn chưa thu. Số
            trừ vào cọc bên dưới đã điền sẵn theo số đó — sửa lại nếu họ trả tiền mặt
            trước khi đi.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Thông tin trả phòng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <Field name="endDate" label="Ngày trả phòng" required errors={errors}>
            <Input type="date" defaultValue={today} min={tenancy.startDate} required />
          </Field>

          <div className="space-y-2">
            <Label htmlFor="reason-select">Lý do</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {END_REASON_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Picking "other" swaps the select for a free-text box; either way the
              posted field name stays `endReason`. */}
          {reason === OTHER ? (
            <Field
              name="endReason"
              label="Lý do cụ thể"
              required
              errors={errors}
              className="sm:col-span-2"
            >
              <Input placeholder="Nhập lý do…" required autoFocus />
            </Field>
          ) : (
            <input type="hidden" name="endReason" value={reason} />
          )}

          <div className="flex items-start gap-3 sm:col-span-2">
            <Switch
              id="terminated"
              checked={terminated}
              onCheckedChange={setTerminated}
              aria-describedby="terminated-hint"
            />
            <input
              type="hidden"
              name="terminated"
              value={terminated ? "true" : "false"}
            />
            <div className="space-y-0.5">
              <Label htmlFor="terminated">Chấm dứt sớm</Label>
              <p id="terminated-hint" className="text-xs text-muted-foreground">
                Bật nếu người thuê đi trước hạn hoặc bị mời ra. Chỉ để ghi nhận,
                không tự tính phạt cọc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kết toán cọc.
          Trả phòng ngoài đời luôn là một phép trừ: cọc − nợ − hư hỏng. Trước đây
          phép trừ đó nằm trên tờ giấy nháp của chủ trọ, và sáu tháng sau không ai
          tra lại được vì sao chỉ hoàn từng ấy. */}
      <Card>
        <CardHeader>
          <CardTitle>Kết toán tiền cọc</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <Field
            name="depositDeduction"
            label="Trừ vào cọc"
            errors={errors}
            hint="Tiền còn nợ, điện nước tháng cuối, hư hỏng phải đền."
          >
            <Input
              type="number"
              min={0}
              max={tenancy.deposit}
              step={1000}
              inputMode="numeric"
              value={Number.isFinite(deduction) ? deduction : 0}
              onChange={(event) => setDeduction(Number(event.target.value))}
            />
          </Field>

          <div className="space-y-2">
            <Label htmlFor="depositRefunded">Thực hoàn lại</Label>
            {/* Ô này ĐỌC ĐƯỢC và sửa được, không phải chỉ hiển thị: chủ trọ có
                thể trả làm hai lần, hoặc bớt cho người ở lâu. Số điền sẵn là phép
                trừ thông thường, nhưng con số cuối cùng vẫn do người ký quyết định. */}
            <Input
              id="depositRefunded"
              name="depositRefunded"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              key={refund}
              defaultValue={refund}
            />
            <p className="text-xs text-muted-foreground">
              Điền sẵn = {formatVND(tenancy.deposit)} − {formatVND(parsedDeduction)} ={" "}
              <strong>{formatVND(refund)}</strong>. Sửa được nếu trả làm nhiều lần.
            </p>
          </div>

          <Field
            name="settlementNote"
            label="Lý do trừ cọc"
            required={parsedDeduction > 0}
            errors={errors}
            className="sm:col-span-2"
            hint="Bắt buộc khi có trừ. Ghi rõ để sau này còn tra lại."
          >
            <Input placeholder="Nợ tiền phòng tháng 8, vỡ một ô kính cửa sổ" />
          </Field>

          {overDeposit && (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertCircleIcon />
              <AlertDescription>
                Trừ nhiều hơn số cọc đang giữ. Phần vượt quá là một khoản nợ — lập một
                hoá đơn riêng cho nó, đừng nhét vào đây.
              </AlertDescription>
            </Alert>
          )}

          {stillOwed > 0 && !overDeposit && (
            <Alert variant="warning" className="sm:col-span-2">
              <AlertCircleIcon />
              <AlertDescription>
                Sau khi trừ cọc vẫn còn <strong>{formatVND(stillOwed)}</strong> chưa thu.
                Hoá đơn cũ vẫn ở trạng thái chờ thanh toán cho tới khi bạn ghi nhận —
                trả phòng không tự đóng hoá đơn.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={`/admin/rooms/${tenancy.roomId}`}>Huỷ</Link>
        </Button>
        <SubmitButton pendingText="Đang xử lý…" disabled={overDeposit}>
          <LogOutIcon />
          Xác nhận trả phòng
        </SubmitButton>
      </div>
    </form>
  );
}
