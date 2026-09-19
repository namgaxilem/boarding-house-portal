[← `[requestId]`](../README.md) · [← `/me/maintenance`](../../README.md) · [← Bản đồ route](../../../../../README.md) · [← Mục lục docs](../../../../../../README.md)

# `/me/maintenance/[requestId]/edit` — Sửa phiếu (người thuê)

| | |
|---|---|
| File | `src/app/(tenant)/me/maintenance/[requestId]/edit/page.tsx` (59 dòng) |
| Hàm | `EditMyRequestPage` |
| Guard | `requireUser()` từ layout **+ gọi lại trong trang** |
| Metadata | `export const metadata` tĩnh |

## Chỉ sửa được khi phiếu còn `open`

Chủ trọ vừa chuyển sang `in_progress` là trang này trả `MAINTENANCE_LOCKED`. Xem
[`[requestId]`](../README.md#hai-rào-chắn-hay-gặp).

## Dữ liệu

```ts
features/maintenance/queries :: getMaintenanceRequest
lib/auth/dal                 :: requireUser
```

Không đọc danh sách phòng — người thuê không đổi được phòng của phiếu.

## Giao diện

```
components/common/page-header                PageHeader
components/ui/skeleton                       Skeleton
features/maintenance/components/request-form RequestForm  [client]
```

## Action

`updateMyRequest` — `features/maintenance/actions.ts:103`.

So với `updateRequestAsAdmin` (`:211`): bản này kiểm **quyền sở hữu** (`MAINTENANCE_FORBIDDEN`)
và **trạng thái** (`MAINTENANCE_LOCKED`); bản admin không bị cả hai, và sửa được cả phòng lẫn
mức ưu tiên.
