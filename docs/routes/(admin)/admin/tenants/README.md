[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/tenants` — Danh sách người thuê

| | |
|---|---|
| File | `src/app/(admin)/admin/tenants/page.tsx` (182 dòng) |
| Hàm | `AdminTenantsPage` |
| Guard | `requireAdmin()` từ layout + lặp lại trong `queries.ts` |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Bảng toàn bộ người thuê: ảnh đại diện (chữ cái đầu), tên, điện thoại, phòng đang ở, ngày vào,
tiền cọc, trạng thái hoạt động.

## Dữ liệu

```ts
features/tenants/queries :: listTenants
```

Trả `TenantWithCurrentRoom[]` — hồ sơ kèm phòng đang thuê, gộp sẵn ở tầng adapter thay vì để
trang tự nối.

## Giao diện

```
components/ui/table       Table, TableBody, TableCell, TableHead, TableHeader, TableRow
components/ui/avatar      Avatar, AvatarFallback
components/ui/badge       Badge
components/common/page-header   PageHeader
components/common/empty-state   EmptyState
lib/format                formatDate, formatPhone, formatVND, initials
```

`initials()` dựng chữ cái đầu cho avatar; `formatPhone()` chuẩn hoá hiển thị số Việt Nam.

## Đi tiếp

| Đi đâu | Docs |
|---|---|
| Thêm người thuê | [`new`](new/README.md) |
| Hồ sơ một người | [`[tenantId]`](<[tenantId]/README.md>) |
| Xếp người vào phòng | [`/admin/tenancies/new`](../tenancies/new/README.md) |
