"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2Icon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonthYear } from "@/lib/format";
import { recentPeriods } from "@/lib/period";

/**
 * Chọn tháng cho trang ghi điện nước và trang hoá đơn.
 *
 * Tháng nằm ở query string chứ không ở state: chủ trọ mở đúng tháng cần trên hai
 * thiết bị, hoặc gửi link cho nhau, mà vẫn thấy cùng dữ liệu. Điều hướng bọc trong
 * `useTransition` nên nút hiện spinner thay vì đứng im lúc trang tải lại.
 */
export function PeriodPicker({
  period,
  months = 12,
  label = "Tháng",
}: {
  period: string;
  months?: number;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const options = recentPeriods(months);
  // Kỳ đang xem có thể cũ hơn danh sách (mở từ link cũ) — thêm vào để Select
  // không hiện trống trơn.
  if (!options.includes(period)) options.push(period);

  function select(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("period", value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Select value={period} onValueChange={select}>
        <SelectTrigger className="w-[132px]" aria-label="Chọn tháng">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((value) => (
            <SelectItem key={value} value={value}>
              {formatMonthYear(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
