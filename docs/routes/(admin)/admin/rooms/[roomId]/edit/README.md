[← `[roomId]`](../README.md) · [← `/admin/rooms`](../../README.md) · [← Bản đồ route](../../../../../README.md) · [← Mục lục docs](../../../../../../README.md)

# `/admin/rooms/[roomId]/edit` — Sửa phòng

| | |
|---|---|
| File | `src/app/(admin)/admin/rooms/[roomId]/edit/page.tsx` (55 dòng) |
| Hàm | `EditRoomPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Đọc phòng hiện tại rồi đổ vào `RoomForm`. Không có gì khác.

## Dữ liệu

```ts
lib/db :: db        // db.getRoom(roomId)
```

## Giao diện

```
components/common/page-header       PageHeader
components/ui/skeleton              Skeleton      ← EditSkeleton khai ngay trong file, dòng 24
features/rooms/components/room-form RoomForm  [client]
```

`RoomForm` dùng chung với [`new`](../../new/README.md); truyền `room` vào thì form chạy chế độ sửa.

> ⚠️ `EditSkeleton` ở đây gần như trùng với bản trong
> [`/admin/tenants/[tenantId]/edit`](<../../../tenants/[tenantId]/edit/README.md>).
> Xem [10](../../../../../../10-ra-soat-cau-truc.md#46).

## Action

`updateRoom` — `features/rooms/actions.ts`, schema `roomSchema`.

Thành công thì `redirect` về [`[roomId]`](../README.md).
