[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/settings` — Thông tin nhà trọ

| | |
|---|---|
| File | `src/app/(admin)/admin/settings/page.tsx` (180 dòng) |
| Layout lồng | `src/app/(admin)/admin/settings/layout.tsx` (19 dòng) |
| Hàm | `HouseSettingsPage` |
| Guard | `requireAdmin()` từ layout group |
| Metadata | `export const metadata` tĩnh |

## Layout lồng

Đây là **layout lồng duy nhất** trong app ngoài layout của bốn route group:

```ts
components/common/page-header          PageHeader
features/settings/components/settings-tabs SettingsTabs   [client]
```

`SettingsTabs` **tự dựng bằng `Link` + `usePathname` + `cn`**, không dùng Radix Tabs. Đó là lý do
`src/components/ui/tabs.tsx` hiện không ai import
([10](../../../../10-ra-soat-cau-truc.md#44)).

Bốn tab:

| Tab | URL | Nội dung |
|---|---|---|
| Nhà trọ | `/admin/settings` | **Chỉ đọc** — đến từ `config/site.ts` |
| Tài khoản | [`account`](account/README.md) | Hồ sơ + mật khẩu của chính chủ trọ |
| Nhận tiền | [`payments`](payments/README.md) | Tài khoản ngân hàng, mã QR |
| Wifi | [`wifi`](wifi/README.md) | Mạng theo nhà / theo tầng / theo phòng |

## Trang này chỉ đọc — và đó là chủ ý

```ts
config/site :: houseConfig, fullAddress
lib/format  :: formatPhone, formatVND
```

**Không có bảng `settings` trong database.** `src/config/site.ts` là nguồn sự thật duy nhất cho
tên, địa chỉ, liên hệ, nội quy, đơn giá mặc định, múi giờ. Trang này chỉ hiển thị lại để chủ trọ
đối chiếu với những gì người thuê nhìn thấy.

Đổi thông tin = sửa file rồi deploy lại. Đánh đổi có ý thức: không bao giờ có chuyện hai nơi ghi
hai giá trị khác nhau.

Ba tab còn lại thì **có** ghi database — chúng quản dữ liệu động (tài khoản nhận tiền, mạng
wifi), không phải cấu hình nhà trọ.

## Giao diện

```
components/ui/alert  Alert, AlertDescription, AlertTitle    ← nhắc "sửa ở file, không sửa ở đây"
components/ui/badge  Badge
components/ui/card   Card, CardContent, CardHeader, CardTitle
components/common/link Link
```
