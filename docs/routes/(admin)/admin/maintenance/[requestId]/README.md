[← `/admin/maintenance`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/maintenance/[requestId]` — Xử lý phiếu báo hỏng

| | |
|---|---|
| File | `src/app/(admin)/admin/maintenance/[requestId]/page.tsx` (234 dòng) |
| Hàm | `generateMetadata`, `AdminMaintenanceDetailPage` |
| Guard | `requireAdmin()` từ layout **+ gọi lại trong trang** |
| Metadata | **`generateMetadata`** |

## Dữ liệu

```ts
features/maintenance/queries :: getMaintenanceRequest
lib/auth/dal                 :: requireAdmin
lib/db                       :: db
lib/format                   :: formatDateTime
```

Trang gọi `requireAdmin()` lần nữa dù layout đã gọi — lớp thứ hai, và nhờ `cache()` của React
nên không tốn thêm truy vấn.

## Giao diện

```
components/common/status-badge  MaintenanceStatusBadge, MaintenancePriorityBadge
components/common/confirm-form  ConfirmForm
components/common/page-header   PageHeader
features/maintenance/components/request-actions AdminStatusForm, CloseRequestForm  [client]
features/maintenance/components/request-photos  RequestPhotos                      [client] (213 dòng)
components/ui/{alert,button,card,skeleton}
```

## Ảnh kèm phiếu

Bucket **`maintenance-photos`** (riêng tư). Nén trong trình duyệt theo
`MAINTENANCE_PHOTO_POLICY`: 1600px, quality 0.82, đích 400KB, tối đa 5 ảnh/lần và 6 ảnh/phiếu.

Action: `uploadMaintenancePhotos` (`actions.ts:303`), `deleteMaintenancePhoto` (`:354`).

`MAINTENANCE_PHOTO_FORBIDDEN` → *"Không có quyền thêm hoặc xoá ảnh ở phiếu này. Phiếu đã đóng,
hoặc ảnh do người khác tải lên."*

> ⚠️ Pipeline upload trong `request-photos.tsx:92-111` trùng ~50 dòng với
> `features/rooms/components/photo-uploader.tsx:51-70`, copy cả comment.
> Xem [10](../../../../../10-ra-soat-cau-truc.md#45).

## Action

| Action | File | Việc |
|---|---|---|
| `setRequestStatus` | `actions.ts:241` | Qua `AdminStatusForm` — chuyển `open`/`in_progress`/`resolved` |
| `closeRequest` | `actions.ts:140` | Qua `CloseRequestForm` |
| `deleteRequest` | `actions.ts:271` | Qua `ConfirmForm` |

## Điều đáng nhớ: bắt đầu xử lý là khoá phiếu

Khi chủ trọ chuyển phiếu khỏi `open`, người thuê **mất quyền sửa** phiếu của chính họ:

```
MAINTENANCE_LOCKED → "Chủ trọ đã bắt đầu xử lý phiếu này nên không sửa được nữa.
                      Gửi phiếu mới nếu có thêm thông tin."
```

Lý do: chủ trọ đã đọc và hành động theo nội dung cũ; đổi nội dung sau lưng thì hai bên nói về
hai việc khác nhau.

## Đi tiếp

- [`edit`](edit/README.md)
- Bản của người thuê: [`/me/maintenance/[requestId]`](<../../../../(tenant)/me/maintenance/[requestId]/README.md>)
