[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/reports` — Báo cáo doanh thu

| | |
|---|---|
| File | `src/app/(admin)/admin/reports/page.tsx` (282 dòng) |
| Hàm | `ReportsPage` |
| Guard | `requireAdmin()` từ layout + lặp lại trong `queries.ts` |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Doanh thu theo tháng (biểu đồ + bảng), doanh thu theo phòng, và **dung lượng Storage đang dùng**.

## Dữ liệu

```ts
features/dashboard/queries :: getRevenueReport
lib/format                 :: formatCompactVND, formatMonthYear, formatNumber, formatVND
lib/utils                  :: cn
```

`getRevenueReport()` trả `RevenueReport`: `RevenuePeriod[]` (mỗi tháng), `RevenueByRoom[]`,
`RevenueTotals`. Số tháng do `REPORT_MONTHS` trong `features/dashboard/queries.ts:63` quyết định.

**Mọi con số suy ra từ bảng `invoices`** — không có bảng thống kê riêng, nên báo cáo không bao
giờ lệch với hoá đơn.

Khung tháng dựng bằng `nextPeriodString()` (`supabase-adapter.ts:744`) — thuần chuỗi `"YYYY-MM"`,
không đụng `Date`, nên tháng nào không có hoá đơn vẫn hiện ra với số 0 thay vì biến mất.

## Dung lượng Storage

```ts
features/settings/components/storage-usage :: StorageUsage
```

Đọc hàm Postgres `storage_usage()` (`supabase/migrations/20260906000011_storage_budget.sql`),
trả `StorageBucketUsage[]`. Đây là trang duy nhất ngoài `/admin/settings` hiện khối này — dự án
chạy gói free Supabase (1GB Storage, 5GB băng thông/tháng) nên con số này đáng nhìn thường xuyên.

## Giao diện

```
features/dashboard/components/revenue-chart RevenueChart   [client]
components/common/stat-card                 StatCard
components/common/empty-state               EmptyState
components/common/page-header               PageHeader
components/ui/table  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
components/ui/{card,skeleton}
```

`formatCompactVND` cho ô số liệu và trục biểu đồ; `formatVND` cho bảng chi tiết.

## Đi tiếp

- [`/admin`](../README.md) — bản rút gọn của cùng số liệu
- [`/admin/invoices`](../invoices/README.md) — nguồn của mọi con số ở đây
- [`/admin/settings`](../settings/README.md) — cấu hình đơn giá
