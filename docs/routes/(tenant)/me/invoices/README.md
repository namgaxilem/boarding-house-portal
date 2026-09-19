[← `/me`](../README.md) · [← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/invoices` — Hoá đơn của tôi

| | |
|---|---|
| File | `src/app/(tenant)/me/invoices/page.tsx` (104 dòng) |
| Hàm | `MyInvoicesPage` |
| Guard | `requireUser()` từ layout + lặp lại trong `queries.ts` |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
features/invoices/queries :: listMyInvoices
lib/format                :: formatDate, formatMonthYear, formatVND
```

`listMyInvoices()` chỉ trả hoá đơn của người đang đăng nhập. Hai lớp đảm bảo: hàm lọc theo
`tenantId`, và **RLS trên bảng `invoices`** chặn ở tầng database — nên kể cả gọi PostgREST thẳng
bằng anon key cũng không lấy được hoá đơn người khác.

## Hoá đơn nháp không hiện ở đây

Chỉ hoá đơn đã `issued` / `paid` / `void` mới đến tay người thuê. Bản `draft` là nháp của chủ
trọ — xem [`/admin/invoices`](<../../../(admin)/admin/invoices/README.md#vòng-đời-hoá-đơn>).

## Giao diện

```
features/invoices/components/invoice-lines InvoiceStatusBadge
components/common/page-header  PageHeader
components/common/empty-state  EmptyState
components/common/link         Link
components/ui/{card,skeleton}
```

> ⚠️ `ListSkeleton` trong file này gần như trùng với ba bản ở `admin/maintenance`,
> `me/maintenance`, `me/notifications`. Xem [10](../../../../10-ra-soat-cau-truc.md#46).

## Đi tiếp

[`[invoiceId]`](<[invoiceId]/README.md>) — chi tiết + in.
