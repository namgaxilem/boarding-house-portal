[← Bản đồ route](../README.md) · [← Mục lục docs](../../README.md)

# Route group `(tenant)` — khu vực người thuê

| | |
|---|---|
| Layout | `src/app/(tenant)/layout.tsx` (50 dòng) |
| Guard | **`requireUser()`** — chỉ cần đăng nhập, không cần vai trò |
| URL | `/me/**` |

## Guard

```ts
lib/auth/dal :: requireUser
```

Khác `(admin)`: ở đây dùng `requireUser()`, không phải `requireAdmin()`. Chủ trọ cũng vào được
`/me` — hữu ích khi cần xem người thuê đang thấy gì.

Chưa đăng nhập → `redirect("/login?expired=1")`. Cờ `expired` để proxy xoá cookie cũ và không
tạo vòng lặp chuyển hướng.

## Layout dựng gì

```
components/layout/tenant-nav  TenantBottomNav
components/layout/user-menu   UserMenu
components/common/theme       ThemeToggle
features/notifications/components/notification-bell  NotificationBell, NotificationBellFallback
config/site                   houseConfig
```

**Bottom nav, không sidebar** — người thuê gần như chỉ dùng điện thoại, và app này cài được như
PWA lên màn hình chính.

`NotificationBell` bọc trong Suspense với `NotificationBellFallback`, nên đếm số chưa đọc không
chặn việc hiện khung trang.

## Hai nhóm mục nav

`components/layout/nav-items.ts` chia đôi:

| Hằng | Hiện ở |
|---|---|
| `TENANT_NAV` | Bottom nav — vài mục hay dùng nhất |
| `TENANT_SECONDARY` | Danh sách trên chính trang [`/me`](me/README.md) |

Bottom nav trên điện thoại chỉ chứa nổi 4–5 mục; phần còn lại đẩy vào trang chủ thay vì nhồi
hết vào thanh dưới.

## "Chưa được xếp phòng"

Người thuê mới tạo tài khoản mà chưa có `tenancy` thì nhiều trang không có gì để hiện. Thay vì
trang trống trông như lỗi, chúng render `NoRoomNotice`
(`components/common/no-room-notice.tsx`) — dùng ở `/me`, `/me/room`, `/me/wifi`,
`/me/maintenance`, `/me/maintenance/new`.

## Trang trong group

| URL | Docs | Dòng |
|---|---|---|
| `/me` | [me](me/README.md) | 201 |
| `/me/room` | [room](me/room/README.md) | 205 |
| `/me/profile` | [profile](me/profile/README.md) | 151 |
| `/me/identity` | [identity](me/identity/README.md) | 160 |
| `/me/invoices` | [invoices](me/invoices/README.md) | 104 |
| `/me/invoices/[invoiceId]` | [invoices/[invoiceId]](<me/invoices/[invoiceId]/README.md>) | 75 |
| `/me/maintenance` | [maintenance](me/maintenance/README.md) | 86 |
| `/me/maintenance/new` | [maintenance/new](me/maintenance/new/README.md) | 54 |
| `/me/maintenance/[requestId]` | [maintenance/[requestId]](<me/maintenance/[requestId]/README.md>) | 167 |
| `/me/maintenance/[requestId]/edit` | [maintenance/[requestId]/edit](<me/maintenance/[requestId]/edit/README.md>) | 59 |
| `/me/wifi` | [wifi](me/wifi/README.md) | 92 |
| `/me/rules` | [rules](me/rules/README.md) | 47 |
| `/me/notifications` | [notifications](me/notifications/README.md) | 42 |
