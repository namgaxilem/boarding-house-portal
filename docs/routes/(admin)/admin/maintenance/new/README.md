[← `/admin/maintenance`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/maintenance/new` — Chủ trọ tạo phiếu báo hỏng

| | |
|---|---|
| File | `src/app/(admin)/admin/maintenance/new/page.tsx` (46 dòng) |
| Hàm | `NewMaintenancePage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Vì sao chủ trọ cũng tạo phiếu

Hỏng hóc không phải lúc nào cũng do người thuê báo qua app: hỏng khu vực chung, người thuê gọi
điện, hoặc chủ trọ tự phát hiện khi đi kiểm tra. Ghi vào đây thì mọi việc sửa chữa nằm chung một
sổ.

## Dữ liệu

```ts
lib/db :: db      // danh sách phòng để chọn
```

## Giao diện

```
components/common/page-header                   PageHeader
components/ui/skeleton                          Skeleton
features/maintenance/components/request-form    RequestForm  [client]
```

`RequestForm` dùng chung cho **bốn** trang: trang này, `[requestId]/edit`,
[`/me/maintenance/new`](<../../../../(tenant)/me/maintenance/new/README.md>) và
[`/me/maintenance/[requestId]/edit`](<../../../../(tenant)/me/maintenance/[requestId]/edit/README.md>).
Action được truyền vào từ ngoài, nên cùng một form phục vụ cả hai vai.

## Action

`createRequestAsAdmin` — `features/maintenance/actions.ts:176`.

Khác `createMyRequest` (bản của người thuê) ở hai chỗ: chủ trọ **chọn được phòng** bất kỳ và
**đặt được mức ưu tiên** ngay khi tạo.
