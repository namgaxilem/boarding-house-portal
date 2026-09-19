[← `/admin/settings`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/settings/payments` — Cách nhận tiền

| | |
|---|---|
| File | `src/app/(admin)/admin/settings/payments/page.tsx` (35 dòng) |
| Hàm | `PaymentSettingsPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

Trang mỏng: toàn bộ giao diện nằm trong một component client.

## Dữ liệu

```ts
features/payments/queries :: listAllPaymentAccounts
```

Bảng `payment_accounts`, hai loại (`payment_account_kind`):

| `kind` | Nội dung |
|---|---|
| `bank` | Ngân hàng, số tài khoản, chủ tài khoản, cú pháp chuyển khoản |
| `qr` | Ảnh mã QR tải lên bucket `payment-qr` (công khai) |

## Giao diện

```
features/payments/components/payment-manager PaymentManager  [client] (462 dòng)
components/ui/{alert,skeleton}
```

`PaymentManager` là component client dài thứ hai của repo — nó gộp thêm/sửa/xoá/đổi thứ tự và
upload ảnh QR vào một chỗ.

## Ảnh QR nén khác mọi ảnh khác

`PAYMENT_QR_POLICY`: **quality 0.92 nhưng chỉ 1000px**, đích 250KB, đúng 1 ảnh.

QR sống bằng cạnh sắc giữa ô đen và ô trắng — nén mạnh làm nhoè cạnh và máy quét đọc sai. 1000px
thừa sức cho một mã QR vốn thường 300–600px.

## Action

| Action | File | Việc |
|---|---|---|
| `savePaymentAccount` | `features/payments/actions.ts:40` | Thêm / sửa |
| `deletePaymentAccount` | `:110` | Xoá |
| `movePaymentAccount` | `:120` | Đổi thứ tự ưu tiên |
| `togglePaymentAccount` | `:137` | Bật / tắt |

Thứ tự có ý nghĩa: cách nằm trên là cách chủ trọ muốn người thuê dùng. Dòng mới luôn xuống cuối
(`nextPaymentSortOrder()` — `supabase-adapter.ts:753`) để không cướp chỗ cách đang ưu tiên.

| Mã lỗi | Thông điệp |
|---|---|
| `PAYMENT_QR_REQUIRED` | "Chọn ảnh QR để tải lên." |
| `PAYMENT_QR_UPLOAD_FORBIDDEN` | "Không có quyền tải ảnh QR lên. Đăng nhập lại bằng tài khoản chủ trọ." |

## Người thuê thấy ở đâu

- [`/me/contact`](<../../../../(tenant)/me/contact/README.md>) — qua `PaymentMethods`
- Trên mỗi hoá đơn — qua `InvoicePaymentInfo`
  ([`/me/invoices/[invoiceId]`](<../../../../(tenant)/me/invoices/[invoiceId]/README.md>))

Ngoài ra `houseConfig.bank` trong `config/site.ts` là số tài khoản **tĩnh** hiện trên trang
công khai. Hai nguồn khác nhau, phục vụ hai khán giả khác nhau.
