[← `(marketing)`](../README.md) · [← Bản đồ route](../../README.md) · [← Mục lục docs](../../../README.md)

# `/rooms` — Danh sách phòng trống

| | |
|---|---|
| File | `src/app/(marketing)/rooms/page.tsx` (176 dòng) |
| Hàm | `PublicRoomsPage` |
| Guard | không |
| Metadata | `export const metadata` tĩnh |
| Render | Server Component |

## Việc của trang

Liệt kê **chỉ phòng trống**, kèm ảnh, giá, diện tích, số người tối đa. Người lạ xem xong thì
gọi điện — trang không có form đặt phòng.

## Dữ liệu

| Nguồn | Hàm |
|---|---|
| `lib/db/public-rooms` | `listVacantRooms()` |
| `config/site` | `houseConfig`, `telHref` |

Hàm `listVacantRooms()` trả `RoomWithPhotos` — phòng kèm ảnh, đúng một truy vấn.

Ảnh đến từ bucket **`room-photos` (công khai)**, hiển thị qua `next/image`. Host được
`next.config.ts` cho phép dựa trên `NEXT_PUBLIC_SUPABASE_URL` — xem
[08-cau-hinh.md](../../../08-cau-hinh.md#ảnh).

## Giao diện

```
components/ui/badge          Badge
components/ui/button         Button
components/ui/card           Card, CardContent
components/common/empty-state EmptyState     ← khi hết phòng trống
lib/format                   formatVND
```

## Đi tiếp

- [`/`](../page/README.md)
- [`/contact`](../contact/README.md)

Phía quản trị của cùng dữ liệu này: [`/admin/rooms`](<../../(admin)/admin/rooms/README.md>).
