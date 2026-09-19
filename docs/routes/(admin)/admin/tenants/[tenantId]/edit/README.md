[← `[tenantId]`](../README.md) · [← `/admin/tenants`](../../README.md) · [← Bản đồ route](../../../../../README.md) · [← Mục lục docs](../../../../../../README.md)

# `/admin/tenants/[tenantId]/edit` — Sửa hồ sơ người thuê

| | |
|---|---|
| File | `src/app/(admin)/admin/tenants/[tenantId]/edit/page.tsx` (57 dòng) |
| Hàm | `EditTenantPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
lib/db :: db        // db.getTenant(tenantId)
```

## Giao diện

```
components/common/page-header           PageHeader
components/ui/skeleton                  Skeleton   ← EditSkeleton khai trong file, dòng 26
features/tenants/components/tenant-form TenantForm  [client]
```

Dùng chung form với [`new`](../../new/README.md).

## Action

`updateTenant` — `features/tenants/actions.ts`.

**Không** đổi mật khẩu ở đây: việc đó nằm ở `ResetTenantPasswordForm` trên trang
[`[tenantId]`](../README.md), vì nó cần service-role key và là thao tác khác hẳn về hệ quả.

Chủ trọ sửa hồ sơ **của chính mình** ở [`/admin/settings/account`](../../../settings/account/README.md);
người thuê sửa hồ sơ của họ ở [`/me/profile`](<../../../../../(tenant)/me/profile/README.md>) —
ba đường khác nhau, ba action khác nhau (`updateTenant`, `updateOwnAccount`, `updateOwnProfile`).
