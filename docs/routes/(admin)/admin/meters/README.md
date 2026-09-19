[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/meters` — Ghi chỉ số điện nước

| | |
|---|---|
| File | `src/app/(admin)/admin/meters/page.tsx` (82 dòng) |
| Hàm | `MetersPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

Bước **đầu tiên** của mạch tính tiền hằng tháng: ghi chỉ số → lập hoá đơn.

## Việc của trang

Một bảng, mỗi phòng một dòng, cho một **kỳ** (`YYYY-MM`). Chủ trọ gõ chỉ số cuối kỳ; chỉ số đầu
kỳ tự lấy từ kỳ trước.

## Kỳ tính tiền

```ts
lib/period :: currentPeriod, toPeriod
lib/format :: formatMonthYear
```

Kỳ là **chuỗi `"YYYY-MM"`**, xử lý thuần chuỗi không đụng `Date` — tránh mọi bẫy múi giờ.
Kỳ đang xem đến từ query string, mặc định `currentPeriod()`.

## Dữ liệu

```ts
features/meters/queries :: listMeterRows
```

`listMeterRows(period)` trả mỗi phòng một dòng: chỉ số kỳ này (nếu đã ghi), chỉ số kỳ trước, và
số đã dùng. Phòng trống vẫn hiện — đồng hồ vẫn phải đọc.

## Giao diện

```
components/common/period-picker        PeriodPicker   [client]
components/common/page-header          PageHeader
components/common/empty-state          EmptyState
features/meters/components/meter-row-form MeterRowForm [client] (161 dòng)
```

Mỗi dòng là một form độc lập — lưu từng phòng một, không phải điền hết cả bảng rồi mới bấm lưu.

## Action

| Action | File |
|---|---|
| `saveMeterReading` | `features/meters/actions.ts:24` |
| `deleteMeterReading` | `features/meters/actions.ts:53` |

### Ràng buộc

| Mã lỗi | Thông điệp |
|---|---|
| `METER_READING_BACKWARDS` | "Chỉ số cuối kỳ nhỏ hơn đầu kỳ. Đồng hồ không chạy lùi — kiểm tra lại số vừa gõ." |
| `DUPLICATE_METER_READING` | "Phòng này đã có chỉ số của tháng đó." |

## Đi tiếp

[`/admin/invoices/new`](../invoices/new/README.md) — không có chỉ số của kỳ thì không lập được
hoá đơn (`INVOICE_NO_READING`).

Người thuê xem lại chỉ số phòng mình ở [`/me/room`](<../../../(tenant)/me/room/README.md>).
