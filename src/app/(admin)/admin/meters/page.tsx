import { Suspense } from "react";
import type { Metadata } from "next";
import { GaugeIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { PeriodPicker } from "@/components/common/period-picker";
import { EmptyState } from "@/components/common/empty-state";
import { MeterRowForm } from "@/features/meters/components/meter-row-form";
import { listMeterRows } from "@/features/meters/queries";
import { formatMonthYear } from "@/lib/format";
import { currentPeriod, toPeriod } from "@/lib/period";

export const metadata: Metadata = { title: "Ghi điện nước" };

// Cả trang là dữ liệu theo tháng đang chọn — không có phần tĩnh nào để giữ lại.
export const instant = true;

export default async function MetersPage(props: PageProps<"/admin/meters">) {
  const searchParams = await props.searchParams;
  const period =
    toPeriod(typeof searchParams.period === "string" ? searchParams.period : null) ??
    currentPeriod();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ghi điện nước"
        description={`Chỉ số đồng hồ tháng ${formatMonthYear(period)}. Số đầu kỳ đã điền sẵn từ lần ghi trước.`}
        breadcrumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Điện nước" }]}
        actions={<PeriodPicker period={period} />}
      />

      <Suspense key={period} fallback={<RowsSkeleton />}>
        <MeterRows period={period} />
      </Suspense>
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  );
}

async function MeterRows({ period }: { period: string }) {
  const rows = await listMeterRows(period);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<GaugeIcon />}
        title="Chưa có phòng nào"
        description="Thêm phòng trước, rồi quay lại ghi chỉ số điện nước."
      />
    );
  }

  const done = rows.filter((row) => row.reading !== null).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Đã ghi {done}/{rows.length} phòng.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          // key gồm cả kỳ: đổi tháng thì form phải nhận số mặc định mới, không
          // giữ lại giá trị người dùng đang gõ cho tháng cũ.
          <MeterRowForm key={`${row.room.id}-${period}`} row={row} period={period} />
        ))}
      </div>
    </div>
  );
}
