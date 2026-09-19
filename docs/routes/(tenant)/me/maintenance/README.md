[← `/me`](../README.md) · [← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/maintenance` — Báo hỏng của tôi

| | |
|---|---|
| File | `src/app/(tenant)/me/maintenance/page.tsx` (86 dòng) |
| Hàm | `MyMaintenancePage` |
| Guard | `requireUser()` từ layout + lặp lại trong `queries.ts` |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
features/maintenance/queries :: listMyMaintenanceRequests
features/tenants/queries     :: getMyTenancy
```

Chỉ phiếu do **chính người này** gửi. RLS chặn thêm ở database.

## Chưa được xếp phòng

```
components/common/no-room-notice NoRoomNotice
```

`getMyTenancy()` trả `null` thì không có phòng để báo hỏng — trang hiện `NoRoomNotice` kèm
`LandlordContact` thay vì một nút tạo phiếu sẽ hỏng.

## Giao diện

```
features/maintenance/components/request-list RequestList
components/common/landlord-contact           LandlordContact
components/common/page-header                PageHeader
components/common/link                       Link
components/ui/{button,skeleton}
```

`RequestList` dùng chung với bản admin
([`/admin/maintenance`](<../../../(admin)/admin/maintenance/README.md>)) và với khối phiếu trên
trang chi tiết phòng.

`LandlordContact` xuất hiện ở cả ba trang maintenance của người thuê — vì thứ hỏng gấp thì người
ta vẫn gọi điện, và app không nên giấu số đó đi.

## Đi tiếp

- [`new`](new/README.md) — gửi phiếu mới
- [`[requestId]`](<[requestId]/README.md>) — theo dõi một phiếu
