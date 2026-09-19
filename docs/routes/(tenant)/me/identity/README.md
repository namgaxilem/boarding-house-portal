[← `/me`](../README.md) · [← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/identity` — Nộp giấy tờ CCCD

| | |
|---|---|
| File | `src/app/(tenant)/me/identity/page.tsx` (160 dòng) |
| Hàm | `MyIdentityPage` |
| Guard | `requireUser()` từ layout **+ gọi lại trong trang** |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Người thuê **quét mã QR trên thẻ CCCD gắn chip**, đính hai ảnh (mặt trước, mặt sau), gửi cho chủ
trọ duyệt. Trang cũng hiện trạng thái hồ sơ hiện tại.

## Quét QR, không OCR

```
features/identity/components/id-scanner  IdScanner  [client] (483 dòng)
features/identity/components/qr-camera   QrCamera   [client] (191 dòng)
lib/qr    :: BarcodeDetector → zxing-wasm
lib/cccd  :: parse chuỗi phân cách bằng "|"
```

Thẻ CCCD gắn chip in sẵn một mã QR chứa họ tên, ngày sinh, số thẻ, giới tính, địa chỉ, ngày cấp —
phân cách bằng `|`. App đọc mã đó, **không gửi ảnh đi đâu để nhận dạng**.

Đường đọc mã: `BarcodeDetector` của trình duyệt nếu có; không thì nạp `zxing-wasm` từ
`/zxing_reader.wasm` (được `postinstall` chép vào `public/`, và `next.config.ts` cho cache một năm).

Camera mở được là nhờ header `Permissions-Policy: camera=(self)` — mọi quyền khác đều đóng.

## Ảnh giấy tờ

Bucket **`id-photos` (riêng tư)**. `ID_PHOTO_POLICY`: 1600px, **quality 0.86** (cao hơn ảnh phòng
vì phải đọc được số trên thẻ), đích 500KB, đúng 2 ảnh.

Xem lại thì ảnh đến qua **signed URL hạn 2 phút** (`IdPhotos`), và mỗi lần truy cập ghi vào
`id_document_access_log`.

## Dữ liệu

```ts
features/identity/queries :: getLatestIdDocument
lib/auth/dal              :: requireUser
lib/db                    :: db
lib/constants             :: ID_DOC_STATUS_LABEL, ID_DOC_STATUS_STYLE
lib/cccd                  :: formatIdNumber
lib/format                :: formatDate, formatDateTime
lib/utils                 :: cn
```

Trạng thái: `pending` | `approved` | `rejected`.

## Action

| Action | File | Việc |
|---|---|---|
| `submitIdDocument` | `features/identity/actions.ts:38` | Gửi hồ sơ mới |
| `withdrawIdDocument` | `features/identity/actions.ts:85` | Rút hồ sơ đang chờ |

| Mã lỗi | Thông điệp |
|---|---|
| `ID_DOCUMENT_PENDING_EXISTS` | "Bạn đang có một hồ sơ chờ chủ trọ duyệt. Xoá hồ sơ cũ trước khi gửi cái mới." |
| `ID_PHOTO_UPLOAD_FORBIDDEN` | "Không tải được ảnh giấy tờ. Đăng xuất rồi đăng nhập lại và thử lần nữa." |

## Đi tiếp

Phía chủ trọ duyệt ở
[`/admin/identity`](<../../../(admin)/admin/identity/README.md>).
