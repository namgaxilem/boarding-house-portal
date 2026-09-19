[← `(marketing)`](../README.md) · [← Bản đồ route](../../README.md) · [← Mục lục docs](../../../README.md)

# `/contact` — Liên hệ

| | |
|---|---|
| File | `src/app/(marketing)/contact/page.tsx` (157 dòng) |
| Hàm | `ContactPage` |
| Guard | không |
| Metadata | `export const metadata` tĩnh |
| Render | Server Component |

## Việc của trang

Địa chỉ, bản đồ, số điện thoại, Zalo, email, giờ tiếp nhận. **Không đọc database** — toàn bộ
nội dung đến từ `config/site.ts`.

## Dữ liệu

```ts
config/site :: houseConfig, fullAddress, telHref, zaloHref
lib/format  :: formatPhone
```

| Trường | Nguồn |
|---|---|
| Địa chỉ đầy đủ | `fullAddress` — ghép từ `houseConfig.address` |
| Nút chỉ đường | `houseConfig.address.mapUrl`. **Để rỗng thì nút tự ẩn** |
| Gọi điện | `telHref` → `tel:` |
| Zalo | `zaloHref` |
| Giờ tiếp nhận | `houseConfig.contact.officeHours` |

## Giao diện

```
components/ui/button          Button
components/ui/card            Card, CardContent, CardHeader, CardTitle
components/common/copy-button CopyButton     ← chép số / địa chỉ vào clipboard
```

## Đi tiếp

- [`/`](../page/README.md)
- [`/rooms`](../rooms/README.md)

Bản dành cho người thuê đã đăng nhập (có thêm thông tin chuyển khoản):
[`/me/contact`](<../../(tenant)/me/contact/README.md>).
