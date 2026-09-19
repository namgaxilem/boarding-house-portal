[← `/admin/rooms`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/rooms/[roomId]` — Chi tiết phòng

| | |
|---|---|
| File | `src/app/(admin)/admin/rooms/[roomId]/page.tsx` (306 dòng) |
| Hàm | `generateMetadata`, `RoomDetailPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | **`generateMetadata`** — tiêu đề tab mang mã phòng |

Trang dài thứ ba của app. Gom năm khối vào một màn hình.

## Năm khối

| Khối | Component | Dữ liệu |
|---|---|---|
| Thông tin + trạng thái | `RoomStatusBadge`, `Card` | `db.getRoom()` |
| Ảnh phòng | `PhotoGrid` + `PhotoUploader` | `db.listRoomPhotos()` |
| Lịch sử thuê | `TenancyHistory` | `db.listTenanciesByRoom()` |
| Nhật ký sự kiện | `EventTimeline` + `RoomEventForm` | `db.listRoomEvents()` |
| Báo hỏng của phòng | `RequestList` (mượn từ slice `maintenance`) | — |

## Dữ liệu

```ts
lib/db     :: db
lib/format :: formatDate, formatDuration, formatVND, toDateInputValue
```

Trang này gọi `db` **trực tiếp** thay vì qua `features/rooms/queries.ts` — `queries.ts` của slice
rooms chỉ có 14 dòng.

## Ảnh

```
features/rooms/components/photo-grid     PhotoGrid      [client]  ← đặt bìa, đổi thứ tự, xoá
features/rooms/components/photo-uploader PhotoUploader  [client]  ← nén rồi tải lên
```

`PhotoUploader` nén ảnh **trong trình duyệt** trước khi gửi, theo `ROOM_PHOTO_POLICY`
(1600px, quality 0.82, đích 400KB, tối đa 10 ảnh/lần và 12 ảnh/phòng). Xem
[04-tang-du-lieu.md](../../../../../04-tang-du-lieu.md#nén-ảnh-trước-khi-tải-lên).

Action: `features/rooms/photo-actions.ts` — `addRoomPhoto`, `deleteRoomPhoto`,
`setRoomCoverPhoto`, `moveRoomPhoto`.

> ⚠️ `setRoomCoverPhoto` và `moveRoomPhoto` trong adapter dùng chung ~15 dòng mở đầu giống hệt
> (`supabase-adapter.ts:1273-1345`). Xem [10](../../../../../10-ra-soat-cau-truc.md#45).

## Action trên trang

| Action | File | Ghi chú |
|---|---|---|
| `deleteRoom` | `features/rooms/actions.ts` | Qua `ConfirmForm`. Chặn nếu phòng đang có người: `ROOM_OCCUPIED` |
| `createRoomEvent` / `deleteRoomEvent` | `features/rooms/actions.ts` | Nhật ký sự kiện phòng |

## Đi tiếp

- [`edit`](edit/README.md) — sửa thông tin phòng
- [`/admin/tenancies/new`](../../tenancies/new/README.md) — xếp người vào phòng này
- [`/admin/rooms`](../README.md)
