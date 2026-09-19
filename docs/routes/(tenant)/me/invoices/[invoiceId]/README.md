[← `/me/invoices`](../README.md) · [← `/me`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/me/invoices/[invoiceId]` — Chi tiết hoá đơn (người thuê)

| | |
|---|---|
| File | `src/app/(tenant)/me/invoices/[invoiceId]/page.tsx` (75 dòng) |
| Hàm | `MyInvoiceDetailPage` |
| Guard | `requireUser()` từ layout **+ gọi lại trong trang** |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
lib/auth/dal :: requireUser
lib/db       :: db
lib/format   :: formatMonthYear
```

Trang tự kiểm hoá đơn có thuộc về người đang đăng nhập không, và RLS chặn thêm một lớp ở database.

## Dùng lại nguyên khối hiển thị của bản admin

```
features/invoices/components/invoice-lines        InvoiceLines, InvoicePaymentInfo
features/invoices/components/invoice-print        PrintButton           [client]
features/invoices/components/invoice-print-header InvoicePrintHeader, InvoicePrintFooter
components/common/page-header  PageHeader
components/ui/skeleton         Skeleton
```

Đây là chỗ tái sử dụng rõ nhất của repo: **một nguồn hiển thị hoá đơn, hai khán giả**. Chủ trọ
và người thuê nhìn đúng cùng các dòng, cùng cách làm tròn, cùng bản in — nên không bao giờ có
chuyện hai bên đọc ra hai con số.

Trang này chỉ **thiếu** phần hành động: không có `MarkPaidForm`, không có nút phát hành/huỷ/xoá.

## Thanh toán

`InvoicePaymentInfo` hiện tài khoản ngân hàng và mã QR từ `payment_accounts`, cấu hình ở
[`/admin/settings/payments`](<../../../../(admin)/admin/settings/payments/README.md>).

## In

`PrintButton` gọi `window.print()`; `globals.css` có khối `@media print` (dòng 319) ẩn nav và
chuẩn hoá màu. Bản in dùng được làm biên nhận giấy.

## Trang thuần đọc

Không action nào. Ghi nhận đã thu là việc của chủ trọ ở
[`/admin/invoices/[invoiceId]`](<../../../../(admin)/admin/invoices/[invoiceId]/README.md>).
