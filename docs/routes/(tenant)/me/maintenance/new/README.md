[← `/me/maintenance`](../README.md) · [← `/me`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/me/maintenance/new` — Gửi phiếu báo hỏng

| | |
|---|---|
| File | `src/app/(tenant)/me/maintenance/new/page.tsx` (54 dòng) |
| Hàm | `NewMyRequestPage` |
| Guard | `requireUser()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
features/tenants/queries :: getMyTenancy
```

Không cho chọn phòng — phòng suy ra từ hợp đồng đang hiệu lực. Chưa có phòng thì
`MAINTENANCE_NO_ROOM` → *"Bạn chưa được xếp vào phòng nào nên chưa gửi báo hỏng được. Liên hệ
chủ trọ."*

## Giao diện

```
features/maintenance/components/request-form RequestForm  [client]
components/common/landlord-contact           LandlordContact
components/common/no-room-notice             NoRoomNotice
components/common/page-header                PageHeader
components/ui/skeleton                       Skeleton
```

`RequestForm` dùng chung bốn trang; action truyền từ ngoài vào nên cùng form phục vụ cả người
thuê lẫn chủ trọ. Xem
[`/admin/maintenance/new`](<../../../../(admin)/admin/maintenance/new/README.md>).

## Gợi ý sẵn

`MAINTENANCE_SUGGESTIONS` (`lib/constants.ts:164`) cho sẵn vài mô tả hay gặp — người thuê bấm
chọn thay vì phải nghĩ cách diễn đạt.

## Action

`createMyRequest` — `features/maintenance/actions.ts:59`.

Khác `createRequestAsAdmin`: không chọn phòng, không đặt mức ưu tiên (chủ trọ đặt sau khi đọc).
Phiếu mới luôn ở trạng thái `open`.

## Ảnh

Bucket `maintenance-photos` (riêng tư), `MAINTENANCE_PHOTO_POLICY`: 1600px, quality 0.82, đích
400KB, tối đa 5 ảnh/lần và 6 ảnh/phiếu. Ảnh báo hỏng chỉ cần nhìn ra hỏng chỗ nào, không cần nét.
