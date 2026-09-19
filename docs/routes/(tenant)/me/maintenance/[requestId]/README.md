[← `/me/maintenance`](../README.md) · [← `/me`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/me/maintenance/[requestId]` — Theo dõi phiếu báo hỏng

| | |
|---|---|
| File | `src/app/(tenant)/me/maintenance/[requestId]/page.tsx` (167 dòng) |
| Hàm | `MyRequestDetailPage` |
| Guard | `requireUser()` từ layout **+ gọi lại trong trang** |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
features/maintenance/queries :: getMaintenanceRequest
lib/auth/dal                 :: requireUser
lib/db                       :: db
lib/format                   :: formatDateTime
```

## Giao diện

```
components/common/status-badge  MaintenanceStatusBadge, MaintenancePriorityBadge
components/common/landlord-contact LandlordContact
components/common/page-header   PageHeader
features/maintenance/components/request-actions CloseRequestForm  [client]
features/maintenance/components/request-photos  RequestPhotos     [client]
components/ui/{alert,button,card,skeleton}
```

Người thuê **không** có `AdminStatusForm` — chuyển `open` → `in_progress` → `resolved` là việc
của chủ trọ.

## Người thuê làm được gì

| Việc | Action | Điều kiện |
|---|---|---|
| Sửa phiếu | `updateMyRequest` (`actions.ts:103`) | **Chỉ khi còn `open`** |
| Thêm / xoá ảnh | `uploadMaintenancePhotos`, `deleteMaintenancePhoto` | Ảnh của chính mình, phiếu chưa đóng |
| Đóng phiếu | `closeRequest` (`actions.ts:140`) | Phiếu của chính mình |

## Hai rào chắn hay gặp

```
MAINTENANCE_FORBIDDEN → "Bạn chỉ sửa hoặc đóng được phiếu do chính mình gửi."

MAINTENANCE_LOCKED    → "Chủ trọ đã bắt đầu xử lý phiếu này nên không sửa được nữa.
                         Gửi phiếu mới nếu có thêm thông tin."
```

Rào thứ hai đáng nhớ: khi chủ trọ chuyển phiếu khỏi `open`, họ **đã đọc và hành động theo nội
dung cũ**. Đổi nội dung sau lưng thì hai bên nói về hai việc khác nhau.

## Đi tiếp

- [`edit`](edit/README.md) — chỉ khi phiếu còn `open`
- Bản của chủ trọ: [`/admin/maintenance/[requestId]`](<../../../../(admin)/admin/maintenance/[requestId]/README.md>)
