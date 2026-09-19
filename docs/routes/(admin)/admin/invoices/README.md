[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/invoices` — Danh sách hoá đơn

| | |
|---|---|
| File | `src/app/(admin)/admin/invoices/page.tsx` (199 dòng) |
| Hàm | `InvoicesPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Hoá đơn của một **kỳ**, lọc được theo trạng thái, kèm tổng tiền. Có nút lập hàng loạt cho cả
nhà trọ.

## Vòng đời hoá đơn

```
draft ──issueInvoice──▶ issued ──markInvoicePaid──▶ paid
  │                        │
  └────voidInvoice─────────┴──▶ void
```

| Trạng thái | Sửa được? | Ghi chú |
|---|---|---|
| `draft` | ✅ | Chưa gửi cho người thuê |
| `issued` | ❌ | `INVOICE_NOT_DRAFT` — "Hoá đơn đã phát hành. Huỷ hoá đơn nếu cần lập lại." |
| `paid` | ❌ | `INVOICE_ALREADY_PAID` |
| `void` | ❌ | `INVOICE_VOID` — "Hoá đơn đã huỷ, không đổi được nữa." |

## Dữ liệu

```ts
features/invoices/queries :: listInvoices
lib/period                :: currentPeriod, toPeriod
lib/constants             :: INVOICE_STATUS_LABEL
lib/format                :: formatMonthYear, formatVND
types                     :: InvoiceStatus
```

Kỳ và trạng thái đọc từ query string; kỳ mặc định `currentPeriod()`.

## Giao diện

```
components/common/period-picker  PeriodPicker  [client]
components/common/page-header    PageHeader
features/invoices/components/invoice-table           InvoiceTable
features/invoices/components/invoice-status-actions  GenerateInvoicesForm  [client]
lib/utils :: cn
```

## Lập hàng loạt

`GenerateInvoicesForm` → `generateMonthlyInvoices` (`features/invoices/actions.ts:238`).
Bỏ qua phòng trống và phòng chưa có chỉ số của kỳ, thay vì ném lỗi cho cả lô.

## Đi tiếp

- [`new`](new/README.md) — lập một hoá đơn
- [`[invoiceId]`](<[invoiceId]/README.md>) — xem / phát hành / ghi nhận đã thu
- [`/admin/meters`](../meters/README.md) — bước trước đó

Người thuê xem hoá đơn của mình ở [`/me/invoices`](<../../../(tenant)/me/invoices/README.md>).
