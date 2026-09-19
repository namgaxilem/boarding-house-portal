[← `/admin/tenants`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/tenants/[tenantId]` — Hồ sơ người thuê

| | |
|---|---|
| File | `src/app/(admin)/admin/tenants/[tenantId]/page.tsx` (346 dòng) |
| Hàm | `generateMetadata`, `TenantDetailPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | **`generateMetadata`** — tiêu đề tab mang tên người thuê |

**Trang dài nhất trong `app/`.** Gom mọi thứ về một người vào một màn hình.

## Các khối

| Khối | Component | Ghi chú |
|---|---|---|
| Hồ sơ | `Avatar` + `Card` | Tên, email, điện thoại, CCCD, trạng thái |
| Lịch sử thuê | `TenancyStatusBadge` | `db.listTenanciesByTenant()` |
| Đặt lại mật khẩu | `ResetTenantPasswordForm` [client] | Cần service-role key |
| Mã cổng / vân tay | `GateCredentialForm` [client] | **Sổ tay nội bộ**, không phải tích hợp TTLock |
| Bật/tắt · Xoá | `ConfirmForm` | `toggleTenantActive`, `deleteTenant` |

## Dữ liệu

```ts
lib/db     :: db
lib/format :: formatDate, formatDuration, formatPhone, formatVND, initials
```

Gọi `db` trực tiếp thay vì qua `features/tenants/queries.ts`.

## Mã cổng ở đây khác `/admin/gate`

`GateCredentialForm` ghi vào bảng `gate_credentials` — đây là **sổ tay nội bộ** của chủ trọ, RLS
chỉ mở cho admin, và **luôn bật** bất kể `houseConfig.features.smartGate`. Nó không gọi API
TTLock nào.

[`/admin/gate`](../../gate/README.md) mới là phần nói chuyện với thiết bị — và phần đó hiện chưa
được nối. Xem [10](../../../../../10-ra-soat-cau-truc.md#42).

> ⚠️ Khối `ConfirmForm` xoá ở đây trùng 12 dòng với bản trong
> `features/meters/components/meter-row-form.tsx:139-150`.

## Action

| Action | File | Cần service-role |
|---|---|---|
| `resetTenantPassword` | `features/tenants/actions.ts` | ✅ |
| `toggleTenantActive` | `features/tenants/actions.ts` | ✅ |
| `deleteTenant` | `features/tenants/actions.ts` | ✅ |
| `saveGateCredential` / `clearGateCredential` | `features/tenants/actions.ts` | — |

Xoá bị chặn nếu người này đang thuê phòng: `TENANT_HAS_ACTIVE_TENANCY` → *"Người này đang thuê
phòng. Cho trả phòng trước khi xoá."*

Tắt tài khoản có hiệu lực **ngay ở request kế tiếp** — `getCurrentUser()` đọc lại `profile` và
trả `null` khi `!isActive`, không chờ token hết hạn.

## Đi tiếp

- [`edit`](edit/README.md)
- [`/admin/tenancies/new`](../../tenancies/new/README.md) — xếp vào phòng
- [`/admin/tenancies/[tenancyId]/checkout`](<../../tenancies/[tenancyId]/checkout/README.md>) — cho trả phòng
- [`/admin/identity`](../../identity/README.md) — duyệt giấy tờ của người này
