[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/identity` — Duyệt giấy tờ CCCD

| | |
|---|---|
| File | `src/app/(admin)/admin/identity/page.tsx` (138 dòng) |
| Hàm | `AdminIdentityPage` |
| Guard | `requireAdmin()` từ layout **+ gọi lại trong trang** |
| Metadata | `export const metadata` tĩnh |

Trang nhạy cảm nhất app: nó hiển thị **ảnh giấy tờ tuỳ thân**. Có huy hiệu số trên nav —
nguồn `getAdminTodo().pendingIdDocuments`.

## Việc của trang

Hàng chờ: hồ sơ người thuê nộp, trạng thái `pending`. Chủ trọ đối chiếu ảnh với số CCCD rồi
**duyệt** hoặc **từ chối kèm lý do**.

## Dữ liệu

```ts
features/identity/queries :: listPendingIdDocuments
lib/auth/dal              :: requireAdmin
lib/cccd                  :: formatIdNumber
lib/format                :: formatDate, formatDateTime
```

Trả `IdDocumentWithTenant[]` — hồ sơ kèm người nộp, vì hàng chờ phải biết hồ sơ này của ai.

## Ba lớp bảo vệ dữ liệu giấy tờ

1. **Bucket `id-photos` riêng tư.** Ảnh chỉ đọc được qua **signed URL hạn 2 phút** — đủ để trình
   duyệt tải, không đủ để chia sẻ lại. Sinh bởi `db.signIdDocumentPhotos()`.
2. **Ghi nhật ký truy cập** vào bảng `id_document_access_log`.
3. **Không OCR.** App đọc mã QR in trên thẻ CCCD gắn chip (`lib/cccd.ts`), không gửi ảnh đi đâu
   để nhận dạng.

Cộng thêm header `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` cho mọi trang — chống
kiểu tấn công nhúng trang này vào iframe trong suốt rồi lừa chủ trọ bấm "Duyệt".

## Giao diện

```
features/identity/components/id-photos        IdPhotos          [client]
features/identity/components/id-review-actions IdReviewActions  [client]
components/common/empty-state                 EmptyState
components/common/page-header                 PageHeader
components/ui/{alert,card,skeleton}
```

`IdPhotos` dùng `<img>` chứ không `next/image` (ảnh signed-URL đổi liên tục, tối ưu vô nghĩa) —
đó là một trong ba `eslint-disable @next/next/no-img-element` của repo.

## Action

| Action | File |
|---|---|
| `approveIdDocument` | `features/identity/actions.ts:95` |
| `rejectIdDocument` | `features/identity/actions.ts:114` |
| `deleteIdDocument` | `features/identity/actions.ts:138` |

| Mã lỗi | Thông điệp |
|---|---|
| `ID_DOCUMENT_ALREADY_REVIEWED` | "Hồ sơ này đã được xử lý rồi. Tải lại trang để xem." |
| `ID_DOCUMENT_NO_NUMBER` | "Hồ sơ thiếu số CCCD nên không duyệt được." |
| `DUPLICATE_ID_NUMBER` | "Số CCCD/CMND này đã gắn với một người thuê khác." |

Duyệt thành công thì số CCCD được ghi vào hồ sơ người thuê — nên ràng buộc duy nhất ở database
mới bung ra ở bước này, không phải lúc nộp.

## Đi tiếp

- Phía người thuê: [`/me/identity`](<../../../(tenant)/me/identity/README.md>)
- Hồ sơ người thuê: [`/admin/tenants/[tenantId]`](<../tenants/[tenantId]/README.md>)
