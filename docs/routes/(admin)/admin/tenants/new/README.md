[← `/admin/tenants`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/tenants/new` — Thêm người thuê

| | |
|---|---|
| File | `src/app/(admin)/admin/tenants/new/page.tsx` (27 dòng) |
| Hàm | `NewTenantPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

Chỉ tiêu đề + form, **không đọc database**.

## Giao diện

```
components/common/page-header          PageHeader
features/tenants/components/tenant-form TenantForm   [client]
```

Dùng chung với [`[tenantId]/edit`](<../[tenantId]/edit/README.md>).

## Action

`createTenant` — `features/tenants/actions.ts`, schema ở `features/tenants/schema.ts`.

### Cần service-role key

Tạo người thuê không chỉ là chèn một hàng `profiles`: nó **tạo tài khoản trong Supabase Auth**.
Việc đó đi qua `lib/supabase/admin.ts`, cần `SUPABASE_SERVICE_ROLE_KEY`. Thiếu biến thì
`getServiceRoleKey()` ném lỗi *"Thiếu SUPABASE_SERVICE_ROLE_KEY — cần key này để tạo/xoá tài
khoản người thuê."*

Các action khác cũng cần key này: đặt lại mật khẩu, bật/tắt tài khoản, xoá người thuê
(xem [`[tenantId]`](<../[tenantId]/README.md>)).

### Lỗi hay gặp

| Mã | Thông điệp |
|---|---|
| `DUPLICATE_EMAIL` | "Email này đã được dùng cho tài khoản khác." |
| `DUPLICATE_PHONE` | "Số điện thoại này đã gắn với một người thuê khác." |
| `DUPLICATE_ID_NUMBER` | "Số CCCD/CMND này đã gắn với một người thuê khác." |
| `INVALID_PHONE` | "Số điện thoại phải có 10 số và bắt đầu bằng 0." |
| `INVALID_ID_NUMBER` | "Số CCCD phải có 12 số, hoặc CMND cũ 9 số." |

Ràng buộc duy nhất nằm ở database (`supabase/migrations/20260804000004_identity.sql`), không chỉ
ở Zod — nên hai request song song cũng không lách được.
