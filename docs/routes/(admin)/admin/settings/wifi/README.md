[← `/admin/settings`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/settings/wifi` — Mạng wifi

| | |
|---|---|
| File | `src/app/(admin)/admin/settings/wifi/page.tsx` (38 dòng) |
| Hàm | `WifiSettingsPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
lib/db :: db      // db.listWifi()
```

Slice `wifi` **không có `queries.ts`** — trang này đọc `db` trực tiếp, và phía người thuê đọc
qua `getMyWifi` nằm nhờ ở `features/tenants/queries.ts`.

## Ba phạm vi

Enum `wifi_scope` quyết định ai thấy mạng nào:

| `scope` | Ai thấy |
|---|---|
| `global` | Mọi người thuê |
| `floor` | Người thuê ở tầng đó |
| `room` | Chỉ phòng đó |

`getMyWifi` lọc theo phòng của người đang đăng nhập, nên người thuê không bao giờ thấy mật khẩu
mạng của phòng khác.

## Giao diện

```
features/wifi/components/wifi-manager WifiManager  [client] (228 dòng)
components/ui/{alert,skeleton}
```

## Action

| Action | File |
|---|---|
| `saveWifi` | `features/wifi/actions.ts:34` |
| `deleteWifi` | `features/wifi/actions.ts:59` |

## Người thuê thấy ở đâu

[`/me/wifi`](<../../../../(tenant)/me/wifi/README.md>) — mật khẩu hiện qua `SecretField`
(che sẵn, bấm mới lộ) kèm nút chép, vì mật khẩu wifi là thứ người ta gõ trên điện thoại.
