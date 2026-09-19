[← `tenancies`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/tenancies/new` — Nhận phòng (check-in)

| | |
|---|---|
| File | `src/app/(admin)/admin/tenancies/new/page.tsx` (99 dòng) |
| Hàm | `CheckInPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Ghép một **người thuê** với một **phòng**: ngày vào, tiền cọc, tiền phòng thoả thuận.

## Dữ liệu

```ts
lib/db     :: db          // danh sách phòng còn chỗ + người chưa thuê
lib/format :: toDateInputValue
```

`toDateInputValue()` đổ ngày vào `<input type="date">` theo múi giờ nhà trọ, không theo giờ máy chủ.

## Giao diện

```
components/common/page-header              PageHeader
components/common/empty-state              EmptyState   ← không còn phòng trống
components/common/link                     Link
components/ui/{button,skeleton}
features/tenancies/components/check-in-form CheckInForm  [client] (178 dòng)
```

## Action

`checkIn` — `features/tenancies/actions.ts:19`, schema `checkInSchema`.

### Ràng buộc

| Mã lỗi | Thông điệp |
|---|---|
| `ROOM_FULL` | "Phòng đã đủ số người tối đa." |
| `TENANT_ALREADY_RENTING` | "Người này đang thuê một phòng khác." |
| `ROOM_NOT_FOUND` / `TENANT_NOT_FOUND` | — |

`maxOccupants` lấy theo từng phòng (mặc định khi tạo phòng đến từ `houseConfig.defaults`).

Check-in thành công cũng ghi một hàng vào `room_events`, nên hiện lên
[dòng thời gian của phòng](<../../rooms/[roomId]/README.md>) và mục "Hoạt động gần đây" trên
[`/admin`](../../README.md).

## Đi tiếp

- [`checkout`](<../[tenancyId]/checkout/README.md>) — khi người này trả phòng
- [`/admin/meters`](../../meters/README.md) — ghi chỉ số đầu kỳ cho phòng vừa có người
