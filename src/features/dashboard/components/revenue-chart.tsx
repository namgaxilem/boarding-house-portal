import { formatCompactVND, formatMonthYear, formatVND } from "@/lib/format";
import type { RevenuePeriod } from "@/types";

/**
 * Biểu đồ cột doanh thu, dựng bằng div.
 *
 * Không thêm thư viện biểu đồ cho một hình duy nhất trong cả app: mọi thư viện
 * đủ dùng đều nặng hơn toàn bộ phần còn lại của trang này, và chúng render ở
 * client nên biểu đồ sẽ nhấp nháy sau khi trang đã hiện.
 *
 * Mỗi cột chia hai phần: đã thu (đặc) chồng dưới phần còn nợ (kẻ sọc). Nhìn vào
 * là thấy ngay tháng nào thu đủ, tháng nào còn treo — thứ mà một cột đơn màu
 * không nói được.
 */
export function RevenueChart({ periods }: { periods: RevenuePeriod[] }) {
  const peak = Math.max(...periods.map((entry) => entry.billed), 1);

  return (
    <div className="space-y-4">
      <div
        role="img"
        aria-label={`Biểu đồ doanh thu ${periods.length} tháng, cao nhất ${formatVND(peak)}`}
        className="flex h-56 items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2"
      >
        {periods.map((entry) => {
          const totalPct = (entry.billed / peak) * 100;
          const collectedPct = entry.billed === 0 ? 0 : (entry.collected / entry.billed) * 100;

          return (
            <div
              key={entry.period}
              className="flex min-w-[38px] flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {entry.billed > 0 ? formatCompactVND(entry.billed) : ""}
              </span>

              <div className="flex w-full flex-1 items-end">
                <div
                  // `title` cho chuột, dòng chữ dưới bảng cho phần còn lại — cột
                  // rỗng vẫn giữ một vạch mảnh để tháng không có hoá đơn vẫn
                  // nhìn ra là một tháng, chứ không phải một khoảng trống.
                  title={`${formatMonthYear(entry.period)}: lập ${formatVND(entry.billed)}, thu ${formatVND(entry.collected)}`}
                  className="relative w-full overflow-hidden rounded-t-md bg-warning/25"
                  style={{ height: `${Math.max(totalPct, entry.billed > 0 ? 4 : 1.5)}%` }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 bg-success"
                    style={{ height: `${collectedPct}%` }}
                  />
                </div>
              </div>

              <span className="text-[10px] tabular-nums text-muted-foreground">
                {entry.period.slice(5, 7)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-success" />
          Đã thu
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-warning/25" />
          Còn nợ
        </span>
        <span>Cột là tháng, số dưới cột là tháng trong năm.</span>
      </div>
    </div>
  );
}
