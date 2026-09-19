[← `/me`](../README.md) · [← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/contact` — Liên hệ & thanh toán

| | |
|---|---|
| File | `src/app/(tenant)/me/contact/page.tsx` (143 dòng) |
| Hàm | `MyContactPage` |
| Guard | `requireUser()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Khác gì `/contact` công khai

Bản công khai ([`(marketing)/contact`](<../../../(marketing)/contact/README.md>)) chỉ có địa chỉ
và số điện thoại. Bản này thêm **cách chuyển tiền** — thứ chỉ người đang thuê mới cần.

## Dữ liệu

```ts
features/payments/components/payment-methods PaymentMethods
features/tenants/queries                     :: getMyTenancy
config/site  :: houseConfig, fullAddress, telHref, zaloHref
lib/format   :: formatPhone
```

`PaymentMethods` đọc `payment_accounts` — tài khoản ngân hàng và ảnh QR mà chủ trọ cấu hình ở
[`/admin/settings/payments`](<../../../(admin)/admin/settings/payments/README.md>).

## Giao diện

```
components/ui/{button,card,skeleton}
```

## Số khẩn cấp

`houseConfig.contact.emergencyPhone` — số gọi khi cháy, rò điện, ngập. Tách khỏi số liên hệ
thường vì hai tình huống không giống nhau.

## Đi tiếp

- [`/me/maintenance/new`](../maintenance/new/README.md) — hỏng hóc thì mở phiếu, đừng chỉ gọi
- [`/me/invoices`](../invoices/README.md)
