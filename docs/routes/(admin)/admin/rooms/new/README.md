[← `/admin/rooms`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/rooms/new` — Thêm phòng

| | |
|---|---|
| File | `src/app/(admin)/admin/rooms/new/page.tsx` (27 dòng) |
| Hàm | `NewRoomPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

Trang mỏng nhất khu vực admin: chỉ tiêu đề + form. **Không đọc database.**

## Giao diện

```
components/common/page-header       PageHeader
features/rooms/components/room-form RoomForm   [client]
```

`RoomForm` dùng chung với [`[roomId]/edit`](<../[roomId]/edit/README.md>) — khác nhau ở chỗ
trang này không truyền `room` vào, nên form chạy ở chế độ tạo mới.

## Giá trị mặc định

Đơn giá điện, nước, phí dịch vụ và số người tối đa lấy từ `houseConfig.defaults`
(`src/config/site.ts:96`), **không** hardcode trong form. Từng phòng vẫn sửa riêng được sau đó.

## Action

`createRoom` — `features/rooms/actions.ts`, schema `roomSchema` (`features/rooms/schema.ts`).

Lỗi hay gặp: `DUPLICATE_ROOM_CODE` → *"Mã phòng này đã tồn tại. Chọn mã khác."*
(bảng dịch ở [`lib/action-result.ts`](../../../../../06-thu-vien-dung-chung.md#trả-kết-quả-từ-server-action--action-resultts-115)).

Thành công thì `redirect` về [`/admin/rooms`](../README.md).
