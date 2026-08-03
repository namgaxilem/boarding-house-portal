"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LogOutIcon } from "lucide-react";

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
}: {
  tenancy: TenancyDetail;
  today: string;
}) {
  const [state, formAction] = useActionState(checkOut, null);
  const errors = fieldErrorsOf(state);

  const [reason, setReason] = useState(END_REASON_OPTIONS[0]);
  const [terminated, setTerminated] = useState(false);

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

            <dt className="text-muted-foreground">Tiền cọc phải hoàn</dt>
            <dd className="text-right font-medium tabular-nums">
              {formatVND(tenancy.deposit)}
            </dd>
          </dl>
        </CardContent>
      </Card>

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

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={`/admin/rooms/${tenancy.roomId}`}>Huỷ</Link>
        </Button>
        <SubmitButton pendingText="Đang xử lý…">
          <LogOutIcon />
          Xác nhận trả phòng
        </SubmitButton>
      </div>
    </form>
  );
}
