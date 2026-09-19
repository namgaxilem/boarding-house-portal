[← `/admin/invoices`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/invoices/[invoiceId]` — Chi tiết hoá đơn

| | |
|---|---|
| File | `src/app/(admin)/admin/invoices/[invoiceId]/page.tsx` (272 dòng) |
| Hàm | `generateMetadata`, `InvoiceDetailPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | **`generateMetadata`** — tiêu đề tab mang mã phòng + kỳ |

## Việc của trang

Xem đủ một hoá đơn, chuyển trạng thái, và **in**.

## Dữ liệu

```ts
lib/db     :: db
lib/format :: formatDate, formatMonthYear, formatPhone
```

## Giao diện

```
features/invoices/components/invoice-lines          InvoiceLines, InvoicePaymentInfo
features/invoices/components/invoice-print          PrintButton           [client]
features/invoices/components/invoice-print-header   InvoicePrintHeader, InvoicePrintFooter
features/invoices/components/invoice-status-actions MarkPaidForm          [client]
components/common/confirm-form                      ConfirmForm
components/common/page-header                       PageHeader
components/ui/{alert,button,card,skeleton}
```

`InvoiceLines` và `InvoicePaymentInfo` dùng lại nguyên vẹn ở bản của người thuê
([`/me/invoices/[invoiceId]`](<../../../../(tenant)/me/invoices/[invoiceId]/README.md>)) — một
nguồn hiển thị, hai khán giả.

`InvoicePaymentInfo` lấy cách nhận tiền từ `payment_accounts`, cấu hình ở
[`/admin/settings/payments`](../../settings/payments/README.md).

## In

`PrintButton` gọi `window.print()`. `InvoicePrintHeader` / `InvoicePrintFooter` chỉ hiện khi in,
và `src/app/globals.css` có khối `@media print` riêng (dòng 319) để ẩn nav, bỏ nền, ép màu chữ.

## Action

| Action | File | Điều kiện |
|---|---|---|
| `issueInvoice` | `actions.ts:125` | Chỉ từ `draft` |
| `markInvoicePaid` | `actions.ts:150` | Qua `MarkPaidForm` — chọn `cash` hoặc `transfer` |
| `voidInvoice` | `actions.ts:193` | Huỷ hoá đơn đã phát hành |
| `deleteInvoice` | `actions.ts:206` | Qua `ConfirmForm` |

Phát hành hoá đơn **gửi thông báo** cho người thuê: `lib/notify.ts` ghi hàng vào `notifications`
và gửi email nếu `isEmailConfigured`.

## Đi tiếp

- [`edit`](edit/README.md) — chỉ khi còn `draft`
- [`/admin/invoices`](../README.md)

Nhắc hạn tự động: [`/api/cron/invoice-reminders`](../../../../api/README.md).
