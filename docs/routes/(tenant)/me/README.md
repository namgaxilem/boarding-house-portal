[← `(tenant)`](../README.md) · [← Bản đồ route](../../README.md) · [← Mục lục docs](../../../README.md)

# `/me` — Trang chủ người thuê

| | |
|---|---|
| File | `src/app/(tenant)/me/page.tsx` (201 dòng) |
| Hàm | `TenantHomePage` |
| Guard | `requireUser()` từ [`(tenant)/layout.tsx`](../README.md#guard) |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Trả lời bốn câu người thuê hỏi nhiều nhất: **phòng tôi**, **nợ bao nhiêu**, **wifi mật khẩu gì**,
**còn gì phải làm**. Cộng nút cài app lên màn hình chính.

## Dữ liệu

```ts
features/tenants/queries  :: getMyTenancy, getMyWifi
features/invoices/queries :: getMyUnpaidInvoices
components/layout/nav-items :: TENANT_SECONDARY
config/site               :: houseConfig
lib/format                :: formatDate, formatDuration, formatMonthYear, formatVND
```

`getMyTenancy()` là hàm trang nào trong `/me` cũng gọi — nó trả hợp đồng đang hiệu lực của người
đăng nhập, hoặc `null`.

## Chưa được xếp phòng

```
components/common/no-room-notice  NoRoomNotice
```

`getMyTenancy()` trả `null` thì trang hiện `NoRoomNotice` thay vì khung trống trông như lỗi.

## Nav phụ

`TENANT_SECONDARY` render **trên chính trang này**, vì bottom nav trên điện thoại chỉ chứa nổi
4–5 mục. Xem [`(tenant)`](../README.md#hai-nhóm-mục-nav).

## Cài app (PWA)

```
components/common/install-prompt  InstallPrompt  [client] (189 dòng)
```

Bắt `beforeinstallprompt`. Chrome Android chỉ bắn sự kiện này khi trang có service worker **đã
đăng ký và có hàm xử lý `fetch`** — đó là toàn bộ lý do `public/sw.js` tồn tại, dù app yêu cầu
có mạng. Xem [08-cau-hinh.md](../../../08-cau-hinh.md#pwa).

## Giao diện

```
components/common/link  Link
components/ui/{badge,card,skeleton}
```

## Đi tiếp

[`/me/room`](room/README.md) · [`/me/invoices`](invoices/README.md) ·
[`/me/maintenance`](maintenance/README.md) · [`/me/wifi`](wifi/README.md) ·
[`/me/identity`](identity/README.md) · [`/me/profile`](profile/README.md) ·
[`/me/rules`](rules/README.md) · [`/me/notifications`](notifications/README.md)
