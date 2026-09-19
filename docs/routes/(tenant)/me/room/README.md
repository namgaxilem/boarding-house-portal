[← `/me`](../README.md) · [← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/room` — Phòng của tôi

| | |
|---|---|
| File | `src/app/(tenant)/me/room/page.tsx` (205 dòng) |
| Hàm | `MyRoomPage` |
| Guard | `requireUser()` từ layout **+ gọi lại trong trang** |
| Metadata | `export const metadata` tĩnh |

Trang dài nhất khu vực người thuê.

## Việc của trang

Ảnh phòng, thông tin hợp đồng (ngày vào, đã ở bao lâu, tiền cọc, tiền phòng), **bảng chỉ số điện
nước theo tháng**, và danh sách người ở chung.

## Dữ liệu

```ts
features/tenants/queries :: getMyTenancy
features/meters/queries  :: listReadingsForRoom
lib/auth/dal             :: requireUser
lib/db                   :: db
lib/period               :: electricUsed, waterUsed
lib/format               :: formatDate, formatDuration, formatMonthYear, formatNumber,
                            formatVND, initials
```

Số điện nước đã dùng tính ngay tại trang bằng `electricUsed()` / `waterUsed()` — cùng hàm mà
[`/admin/invoices/new`](<../../../(admin)/admin/invoices/new/README.md>) dùng để dựng hoá đơn,
nên hai bên không bao giờ ra hai con số.

## Người ở chung

`db.listMyRoommates()` — RLS chỉ cho thấy người **cùng phòng**, và chỉ những trường cần để hiện
tên + chữ cái đầu avatar.

## Giao diện

```
features/rooms/components/photo-gallery PhotoGallery  [client]
components/common/no-room-notice        NoRoomNotice
components/ui/{avatar,badge,card,skeleton}
```

Ảnh từ bucket `room-photos` (công khai) — cùng ảnh mà
[`/rooms`](<../../../(marketing)/rooms/README.md>) hiện cho người lạ.

## Không sửa được gì ở đây

Trang thuần đọc. Đổi thông tin phòng là việc của chủ trọ
([`/admin/rooms/[roomId]`](<../../../(admin)/admin/rooms/[roomId]/README.md>)); hỏng hóc thì
báo qua [`/me/maintenance/new`](../maintenance/new/README.md).
