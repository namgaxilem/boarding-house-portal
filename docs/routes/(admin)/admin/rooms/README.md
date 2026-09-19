[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/rooms` — Danh sách phòng

| | |
|---|---|
| File | `src/app/(admin)/admin/rooms/page.tsx` (84 dòng) |
| Hàm | `AdminRoomsPage` |
| Guard | `requireAdmin()` từ layout + lặp lại trong `queries.ts` |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Liệt kê **mọi** phòng (khác `/rooms` công khai chỉ hiện phòng trống), kèm trạng thái, giá,
số người đang ở. Có bộ lọc theo trạng thái.

## Dữ liệu

```ts
features/rooms/queries :: listRooms
```

`listRooms()` gọi `db.listRooms()`, vốn dùng `loadRoomsWithOccupancy()` trong adapter để gộp
phòng + số người ở trong một lượt truy vấn.

Hai điểm về thứ tự và trạng thái, xử lý trong tầng adapter chứ không ở trang:

| Điểm | Ở đâu |
|---|---|
| Sắp theo **số tự nhiên** (`2` trước `10`) | `compareRooms()` / `roomCodeNumber()` — `supabase-adapter.ts:956` |
| Trạng thái hiển thị suy ra từ trạng thái lưu **+ số người thật** | `effectiveStatus()` — `supabase-adapter.ts:981` |

## Giao diện

```
features/rooms/components/room-list  RoomList   [client]  ← bộ lọc
components/common/page-header        PageHeader
components/common/link               Link
components/ui/{alert,button,skeleton}
```

Bộ lọc giữ trong zustand: `src/stores/room-filter-store.ts` (29 dòng). Store chỉ giữ **lựa chọn
lọc**, không giữ danh sách phòng — dữ liệu vẫn đến từ server component.

## Đi tiếp

| Đi đâu | Docs |
|---|---|
| Thêm phòng | [`new`](new/README.md) |
| Chi tiết một phòng | [`[roomId]`](<[roomId]/README.md>) |

Bản công khai của cùng dữ liệu: [`/rooms`](<../../../(marketing)/rooms/README.md>).
