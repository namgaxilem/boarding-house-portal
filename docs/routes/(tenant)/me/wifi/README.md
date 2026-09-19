[← `/me`](../README.md) · [← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/wifi` — Wifi

| | |
|---|---|
| File | `src/app/(tenant)/me/wifi/page.tsx` (92 dòng) |
| Hàm | `MyWifiPage` |
| Guard | `requireUser()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
features/tenants/queries :: getMyTenancy, getMyWifi
lib/constants            :: WIFI_SCOPE_LABEL
```

`getMyWifi` nằm ở `features/tenants/queries.ts`, **không** ở slice `wifi` — vì nó lọc theo phòng
của người đang đăng nhập, tức là câu hỏi về *người thuê*, không phải về *mạng*.

Ba phạm vi (`wifi_scope`): `global` (cả nhà trọ), `floor` (tầng), `room` (phòng). Người thuê
không bao giờ thấy mật khẩu mạng riêng của phòng khác.

## Giao diện

```
components/common/copy-button    CopyButton, SecretField
components/common/empty-state    EmptyState
components/common/no-room-notice NoRoomNotice
components/ui/{badge,card,skeleton}
```

`SecretField` che mật khẩu, bấm mới lộ, kèm nút chép — vì mật khẩu wifi là thứ người ta gõ trên
điện thoại, và màn hình điện thoại hay bị người bên cạnh nhìn thấy.

## Trang thuần đọc

Không có action nào. Chủ trọ sửa ở
[`/admin/settings/wifi`](<../../../(admin)/admin/settings/wifi/README.md>).
