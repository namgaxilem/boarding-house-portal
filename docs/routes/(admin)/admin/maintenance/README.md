[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/maintenance` — Danh sách báo hỏng

| | |
|---|---|
| File | `src/app/(admin)/admin/maintenance/page.tsx` (124 dòng) |
| Hàm | `MaintenancePage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

Một trong ba mục nav **có huy hiệu số** — vì đây là việc người khác tạo ra cho chủ trọ.
Nguồn huy hiệu: `getAdminTodo().openMaintenance`.

## Vòng đời phiếu

```
open ──▶ in_progress ──▶ resolved ──▶ closed
```

Mức ưu tiên: `low` | `normal` | `urgent`.

## Dữ liệu

```ts
features/maintenance/queries :: listMaintenanceRequests
lib/constants                :: MAINTENANCE_STATUS_LABEL
types                        :: MaintenanceStatus
lib/utils                    :: cn
```

Trả `MaintenanceRequestDetail[]` — phiếu kèm phòng và người báo, gộp sẵn ở adapter.
Lọc theo trạng thái qua query string.

## Giao diện

```
features/maintenance/components/request-list  RequestList
components/common/page-header                 PageHeader
components/common/link                        Link
components/ui/{alert,button,skeleton}
```

`RequestList` dùng lại ở ba nơi: trang này, [`/admin/rooms/[roomId]`](<../rooms/[roomId]/README.md>)
(phiếu của riêng phòng đó) và [`/me/maintenance`](<../../../(tenant)/me/maintenance/README.md>).

> ⚠️ `ListSkeleton` trong file này gần như trùng với ba bản ở `me/invoices`, `me/maintenance`,
> `me/notifications`. Xem [10](../../../../10-ra-soat-cau-truc.md#46).

## Đi tiếp

- [`new`](new/README.md) — chủ trọ tự tạo phiếu
- [`[requestId]`](<[requestId]/README.md>) — xử lý một phiếu
