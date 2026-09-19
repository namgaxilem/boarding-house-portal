[← `[requestId]`](../README.md) · [← `/admin/maintenance`](../../README.md) · [← Bản đồ route](../../../../../README.md) · [← Mục lục docs](../../../../../../README.md)

# `/admin/maintenance/[requestId]/edit` — Sửa phiếu (chủ trọ)

| | |
|---|---|
| File | `src/app/(admin)/admin/maintenance/[requestId]/edit/page.tsx` (64 dòng) |
| Hàm | `EditMaintenancePage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
features/maintenance/queries :: getMaintenanceRequest
lib/db                       :: db      // danh sách phòng cho ô chọn
```

## Giao diện

```
components/common/page-header                 PageHeader
components/ui/skeleton                        Skeleton
features/maintenance/components/request-form  RequestForm  [client]
```

## Action

`updateRequestAsAdmin` — `features/maintenance/actions.ts:211`.

Khác `updateMyRequest` (bản người thuê, `:103`): chủ trọ **không** bị chặn bởi
`MAINTENANCE_LOCKED`, và sửa được cả phòng lẫn mức ưu tiên.

Xem thêm: [`[requestId]`](../README.md#điều-đáng-nhớ-bắt-đầu-xử-lý-là-khoá-phiếu).
