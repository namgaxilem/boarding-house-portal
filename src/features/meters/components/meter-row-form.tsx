"use client";

import { useActionState, useState } from "react";
import { SaveIcon, Trash2Icon, ZapIcon, DropletIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { ConfirmForm } from "@/components/common/confirm-form";
import { deleteMeterReading, saveMeterReading } from "@/features/meters/actions";
import { formatNumber, formatVND } from "@/lib/format";
import { electricUsed, lineAmount, waterUsed } from "@/lib/period";
import type { RoomMeterRow } from "@/types";

/**
 * Ghi chỉ số cho MỘT phòng.
 *
 * Mỗi phòng một <form> riêng thay vì một form khổng lồ cho cả nhà trọ: chủ trọ đi
 * từng phòng đọc đồng hồ trên điện thoại, ghi xong phòng nào lưu ngay phòng đó.
 * Một form chung sẽ mất hết những gì đã gõ nếu mạng chập ở phòng thứ tám.
 */
export function MeterRowForm({ row, period }: { row: RoomMeterRow; period: string }) {
  const [state, formAction] = useActionState(saveMeterReading, null);
  const errors = fieldErrorsOf(state);

  // Số đầu kỳ mặc định = số cuối kỳ trước. Chủ trọ chỉ phải gõ số đang hiện trên
  // đồng hồ, là thao tác duy nhất thực sự cần làm tại chỗ.
  const electricStart = row.reading?.electricStart ?? row.previous?.electricEnd ?? 0;
  const waterStart = row.reading?.waterStart ?? row.previous?.waterEnd ?? 0;

  const [electricEnd, setElectricEnd] = useState(
    String(row.reading?.electricEnd ?? electricStart),
  );
  const [waterEnd, setWaterEnd] = useState(String(row.reading?.waterEnd ?? waterStart));

  const kwh = electricUsed({
    electricStart,
    electricEnd: Number(electricEnd) || 0,
  });
  const m3 = waterUsed({ waterStart, waterEnd: Number(waterEnd) || 0 });
  const preview =
    lineAmount(kwh, row.room.electricPrice) + lineAmount(m3, row.room.waterPrice);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">{row.room.code}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.occupantNames.length > 0
                ? row.occupantNames.join(", ")
                : "Phòng đang trống"}
            </p>
          </div>
          {row.reading ? (
            <Badge variant="success">Đã ghi</Badge>
          ) : (
            <Badge variant="outline">Chưa ghi</Badge>
          )}
        </div>

        <form action={formAction} className="space-y-4">
          <FormMessage state={state} />

          <input type="hidden" name="roomId" value={row.room.id} />
          <input type="hidden" name="period" value={period} />
          <input type="hidden" name="electricStart" value={electricStart} />
          <input type="hidden" name="waterStart" value={waterStart} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="electricEnd"
              label="Điện — số cuối kỳ (kWh)"
              hint={`Đầu kỳ ${formatNumber(electricStart)} · dùng ${formatNumber(kwh)} kWh`}
              required
              errors={errors}
            >
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={electricEnd}
                onChange={(event) => setElectricEnd(event.target.value)}
                required
              />
            </Field>

            <Field
              name="waterEnd"
              label="Nước — số cuối kỳ (m³)"
              hint={`Đầu kỳ ${formatNumber(waterStart)} · dùng ${formatNumber(m3)} m³`}
              required
              errors={errors}
            >
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={waterEnd}
                onChange={(event) => setWaterEnd(event.target.value)}
                required
              />
            </Field>
          </div>

          <Field name="note" label="Ghi chú" errors={errors}>
            <Input
              defaultValue={row.reading?.note ?? ""}
              placeholder="Ví dụ: đồng hồ nước bị mờ, đọc ước lượng"
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <ZapIcon className="size-3.5" aria-hidden />
                {formatNumber(kwh)} kWh
              </span>
              <span className="flex items-center gap-1">
                <DropletIcon className="size-3.5" aria-hidden />
                {formatNumber(m3)} m³
              </span>
              {/* Tạm tính, KHÔNG phải số trên hoá đơn: hoá đơn tính lại ở server
                  theo đơn giá lúc lập. */}
              <span className="tabular-nums">≈ {formatVND(preview)}</span>
            </p>

            <div className="flex items-center gap-2">
              {row.reading && (
                <ConfirmForm
                  action={deleteMeterReading}
                  hidden={{ readingId: row.reading.id, roomId: row.room.id }}
                  title={`Xoá chỉ số phòng ${row.room.code}?`}
                  description="Hoá đơn đã lập từ chỉ số này vẫn giữ nguyên số tiền — hoá đơn là ảnh chụp, không đọc lại chỉ số."
                  triggerLabel={
                    <>
                      <Trash2Icon />
                      Xoá
                    </>
                  }
                  triggerProps={{
                    size: "sm",
                    className: "text-destructive hover:bg-destructive/10",
                  }}
                />
              )}
              <SubmitButton size="sm">
                <SaveIcon />
                Lưu
              </SubmitButton>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
