[← `[invoiceId]`](../README.md) · [← `/admin/invoices`](../../README.md) · [← Bản đồ route](../../../../../README.md) · [← Mục lục docs](../../../../../../README.md)

# `/admin/invoices/[invoiceId]/edit` — Sửa hoá đơn

| | |
|---|---|
| File | `src/app/(admin)/admin/invoices/[invoiceId]/edit/page.tsx` (60 dòng) |
| Hàm | `EditInvoicePage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Chỉ sửa được bản nháp

Hoá đơn đã `issued` / `paid` / `void` không sửa được — action trả lỗi tương ứng
(`INVOICE_NOT_DRAFT`, `INVOICE_ALREADY_PAID`, `INVOICE_VOID`). Muốn sửa hoá đơn đã phát hành thì
**huỷ rồi lập lại**, để người thuê không bao giờ thấy một hoá đơn đổi số sau lưng.

## Dữ liệu

```ts
lib/db     :: db                 // db.getInvoice(invoiceId)
lib/format :: formatMonthYear    // hiện kỳ trên tiêu đề
```

## Giao diện

```
components/common/page-header             PageHeader
components/ui/skeleton                    Skeleton
features/invoices/components/invoice-form InvoiceForm  [client]
```

Cùng form với [`new`](../../new/README.md).

## Action

`updateInvoice` — `features/invoices/actions.ts:95`, schema `invoiceSchema`.

Thành công thì `redirect` về [`[invoiceId]`](../README.md).
