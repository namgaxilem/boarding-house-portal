[← Bản đồ route](../README.md) · [← Mục lục docs](../../README.md)

# Route group `(admin)` — khu vực chủ trọ

| | |
|---|---|
| Layout | `src/app/(admin)/layout.tsx` (65 dòng) |
| Guard | **`requireAdmin()`** — gọi ngay trong layout |
| URL | `/admin/**` |

## Guard

```ts
// src/app/(admin)/layout.tsx
lib/auth/dal :: requireAdmin
```

`requireAdmin()` → `requireUser()` → `getCurrentUser()`. Không phải admin thì `redirect(HOME_PATH.tenant)`.

Đặt ở layout nghĩa là **một trang mới không thể quên guard**. Trang con vẫn gọi lại guard trong
`queries.ts` như lớp thứ hai, và RLS trong Postgres là lớp cuối. Xem
[03-dinh-tuyen.md](../../03-dinh-tuyen.md#ba-lớp-bảo-vệ).

## Layout dựng gì

```
components/layout/admin-nav   AdminSidebar, AdminMobileNav
components/layout/user-menu   UserMenu
components/common/theme       ThemeToggle
features/dashboard/queries    getAdminTodo
```

`getAdminTodo()` được gọi **ở layout**, không ở từng trang — kết quả nuôi huy hiệu số trên
sidebar. Ba mục có huy hiệu:

| Mục nav | Khoá badge | Vì sao có số |
|---|---|---|
| Giấy tờ | `pendingIdDocuments` | Người thuê tạo việc cho chủ trọ |
| Báo hỏng | `openMaintenance` | Người thuê tạo việc cho chủ trọ |
| Cổng | `gateCredentialsToRevoke` | Hệ thống phát hiện: đã trả phòng mà mã cổng còn sống |

Các mục còn lại **cố ý không có huy hiệu** — đó là việc chủ trọ tự chủ động vào làm, và một con
số đỏ ở đó chỉ dạy người ta bỏ qua huy hiệu (`components/layout/nav-items.ts:22-31`).

## Bản đồ khu vực

| Nhóm | Route |
|---|---|
| Tổng quan | [`/admin`](admin/README.md) · [`/admin/reports`](admin/reports/README.md) |
| Phòng | [`/admin/rooms`](admin/rooms/README.md) → [`new`](admin/rooms/new/README.md) · [`[roomId]`](<admin/rooms/[roomId]/README.md>) → [`edit`](<admin/rooms/[roomId]/edit/README.md>) |
| Người thuê | [`/admin/tenants`](admin/tenants/README.md) → [`new`](admin/tenants/new/README.md) · [`[tenantId]`](<admin/tenants/[tenantId]/README.md>) → [`edit`](<admin/tenants/[tenantId]/edit/README.md>) |
| Hợp đồng | [`tenancies`](admin/tenancies/README.md) → [`new`](admin/tenancies/new/README.md) · [`[tenancyId]/checkout`](<admin/tenancies/[tenancyId]/checkout/README.md>) |
| Điện nước | [`/admin/meters`](admin/meters/README.md) |
| Hoá đơn | [`/admin/invoices`](admin/invoices/README.md) → [`new`](admin/invoices/new/README.md) · [`[invoiceId]`](<admin/invoices/[invoiceId]/README.md>) → [`edit`](<admin/invoices/[invoiceId]/edit/README.md>) |
| Báo hỏng | [`/admin/maintenance`](admin/maintenance/README.md) → [`new`](admin/maintenance/new/README.md) · [`[requestId]`](<admin/maintenance/[requestId]/README.md>) → [`edit`](<admin/maintenance/[requestId]/edit/README.md>) |
| Giấy tờ | [`/admin/identity`](admin/identity/README.md) |
| Cổng | [`/admin/gate`](admin/gate/README.md) |
| Cấu hình | [`/admin/settings`](admin/settings/README.md) → [`account`](admin/settings/account/README.md) · [`payments`](admin/settings/payments/README.md) · [`wifi`](admin/settings/wifi/README.md) |
