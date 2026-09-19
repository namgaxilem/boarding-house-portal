[← Mục lục](README.md)

# 04 — Tầng dữ liệu

## Hợp đồng ba mảnh

```
features/*/queries.ts          features/*/actions.ts
        │                              │
        └──────────────┬───────────────┘
                       ▼
          src/lib/db/index.ts        export const db: Repository = supabaseAdapter
                       │
                       ▼
          src/lib/db/repository.ts   interface Repository — 98 method, 18 type *Input
                       │
                       ▼
          src/lib/db/supabase-adapter.ts   implementation duy nhất hiện có
                       │
                       ▼
          @supabase/ssr → PostgREST → Postgres (RLS)
```

Quy tắc: **không trang nào chứa chữ "supabase"**. Đổi backend = viết adapter mới thoả
`Repository` rồi sửa một dòng trong `index.ts`.

`index.ts` cũng re-export 18 type input (`RoomInput`, `InvoiceInput`, `TenancyInput`, …) để
feature không phải import xuyên qua `repository.ts`.

## Bốn client Supabase — bốn ngữ cảnh khác nhau

Đây **không** phải trùng lặp; `@supabase/ssr` yêu cầu client khác nhau cho từng ngữ cảnh.

| File | Hàm | Khoá | Dùng khi |
|---|---|---|---|
| `lib/supabase/server.ts` (34) | `createClient()` | anon | Server Component, Server Action, route handler. Gắn cookie. **Đường chính** |
| `lib/supabase/proxy.ts` (38) | `updateSupabaseSession()` | anon | Chỉ `src/proxy.ts` — làm mới token, ghi cookie lên response |
| `lib/supabase/admin.ts` (21) | client service-role | **service_role** | `"server-only"`. Tạo/xoá tài khoản người thuê, dọn ảnh giấy tờ. Bỏ qua RLS |
| `lib/supabase/client.ts` (8) | `createClient()` | anon | Trình duyệt. **Hiện không ai import** — app thuần server-side |

Cả 91 lời gọi `createClient()` trong `supabase-adapter.ts` đều resolve về `server.ts`.

## Cấu trúc `supabase-adapter.ts`

3.234 dòng, file lớn nhất repo (11% toàn bộ source).

| Dòng | Nội dung |
|---|---|
| 1–310 | Type mô tả hàng trả về từ PostgREST (`RoomRow`, `InvoiceRow`, …) |
| 312–1036 | Mapper `row → domain` (`toRoom`, `toInvoice`, `toIdDocument`, …) + helper storage/sắp xếp |
| 1048–3220 | Một object literal implement `Repository` — **98 method**, nhóm sẵn theo domain |
| 3221+ | `mapTenancyDetails` — lạc chỗ; hai anh em `mapInvoiceDetails`/`mapMaintenanceDetails` ở dòng 696/726 |

Thứ tự nhóm method trong object: rooms → identity → tenants → tenancies → wifi → meters →
invoices → notifications → gate → payments → maintenance → dashboard.

Vài quy ước nội bộ đáng biết:

| Helper | Dòng | Việc |
|---|---|---|
| `num()` | 313 | PostgREST trả `numeric`/`bigint` dưới dạng **chuỗi** khi giá trị lớn — ép về number |
| `rethrow()` | 768 | Biến `PostgrestError` thành mã lỗi mà `describeError()` dịch được |
| `uploadOptions()` | 838 | Tuỳ chọn chung cho mọi `.upload()`, gồm `cacheControl` một năm |
| `removeObjectsBestEffort()` | 891 | Xoá ảnh không được làm hỏng giao dịch chính |
| `compareRooms()` / `roomCodeNumber()` | 956/961 | Sắp phòng theo số tự nhiên: `2` trước `10` |
| `loadRoomsWithOccupancy()` | 993 | Gộp phòng + số người đang ở trong một lượt |
| `effectiveStatus()` | 981 | Trạng thái hiển thị suy ra từ trạng thái lưu + số người thật |

> ⚠️ File này quá lớn và có vài chỗ lặp. Xem [10-ra-soat-cau-truc.md](10-ra-soat-cau-truc.md#43).

## Lược đồ Postgres

### 20 bảng

| Nhóm | Bảng |
|---|---|
| Người & phòng | `profiles`, `rooms`, `tenancies`, `room_events`, `room_photos` |
| Giấy tờ | `id_documents`, `id_document_access_log` |
| Tiện ích | `wifi_networks`, `meter_readings` |
| Tiền | `invoices`, `payment_accounts` |
| Vận hành | `maintenance_requests`, `maintenance_photos`, `notifications` |
| Cổng TTLock | `gate_locks`, `gate_credentials`, `gate_passcodes`*, `gate_fingerprints`*, `gate_events`*, `integration_tokens`* |

`*` — bốn bảng này **chưa có truy vấn nào từ app**. Xem [10](10-ra-soat-cau-truc.md#42).

### 13 enum

```
user_role            admin | tenant
room_status          vacant | occupied | maintenance | reserved
tenancy_status       active | ended | terminated
room_event_type      (nhiều giá trị, xem types/index.ts:15)
wifi_scope           global | floor | room
invoice_status       draft | issued | paid | void
payment_account_kind bank | qr
maintenance_status   open | in_progress | resolved | closed
maintenance_priority low | normal | urgent
notification_type    (nhiều giá trị, xem types/index.ts:41)
id_doc_status        pending | approved | rejected
gate_passcode_kind   tenant | guest | staff
gate_passcode_status (xem types/index.ts:59)
```

Enum Postgres được phản chiếu 1-1 sang union type trong `src/types/index.ts`, và mỗi enum có
một bảng nhãn + class Tailwind trong `src/lib/constants.ts`.

### Ánh xạ tên cột

Database dùng `snake_case`, app dùng `camelCase`. Việc dịch xảy ra **chỉ trong `lib/db/*`**.
Ra khỏi tầng đó, không nơi nào thấy `snake_case` nữa. Quy tắc này ghi ngay đầu
`src/types/index.ts`.

### Migration

12 file trong `supabase/migrations/`, đặt tên `YYYYMMDDNNNNNN_snake_case.sql`. Thứ tự tên là
thứ tự áp dụng. Mỗi file lặp lại số thứ tự trong comment đầu file (`-- NNNN_name.sql`).

- **Local:** `npm run db:start` chạy migration + `seed.sql` tự động. `npm run db:reset` làm lại
  từ đầu (xoá cả `auth.users`, nên phải chạy lại `create-admin`).
- **Cloud:** `npx supabase db push --linked --include-seed`, rồi `npx supabase config push`.

## Storage

Bucket được tạo **bên trong migration**, không phải trong `config.toml` — nghĩa là chạy
migration cũng là bước cấp phát storage.

| Bucket | Công khai | Nguồn | Tạo ở |
|---|---|---|---|
| `room-photos` | ✅ | Ảnh phòng, hiện cả trên trang marketing | `…0005_room_photos.sql:47` |
| `id-photos` | ❌ | Ảnh CCCD. Chỉ truy cập bằng **signed URL hạn 2 phút** | `…0006_id_documents.sql:230` |
| `payment-qr` | ✅ | Ảnh QR nhận tiền | `…0011_storage_budget.sql` |
| `maintenance-photos` | ❌ | Ảnh kèm phiếu báo hỏng | `…0009_maintenance_photos.sql` |

`file_size_limit` toàn cục 50MiB ở `config.toml:118`, nhưng từng bucket bị siết chặt hơn trong
`…0011_storage_budget.sql:33-61` cho khớp `maxUploadBytes` của
[`upload-policy.ts`](../src/lib/upload-policy.ts).

Hàm `storage_usage()` trong cùng migration trả về dung lượng đang dùng theo bucket; giao diện
ở `features/settings/components/storage-usage.tsx`.

### Đường dẫn file là UUID, và điều đó có chủ ý

Mọi lần upload gửi kèm `cacheControl` một năm (`UPLOAD_CACHE_CONTROL` trong adapter). Đường dẫn
là uuid và **không bao giờ bị ghi đè**, nên ảnh là bất biến thật.

Vì vậy `next.config.ts` **cố ý không đặt `minimumCacheTTL`**: theo tài liệu Next 16, hạn dùng
của ảnh đã tối ưu là mức lớn hơn giữa `minimumCacheTTL` và `Cache-Control` của ảnh gốc. Khai
lại chỉ tạo ra hai con số phải giữ cho khớp nhau.

## Nén ảnh trước khi tải lên

```
Người dùng chọn ảnh
   │
   ▼  lib/upload-policy.ts — kiểm maxInputBytes TRƯỚC khi giải nén
   │   (createImageBitmap nạp bitmap thô: ảnh 50MP ăn ~200MB, sập tab điện thoại)
   ▼
lib/image.ts — fitDimensions() + encodeLadder()
   │   hạ dần chất lượng rồi hạ kích thước cho tới khi < targetBytes
   ▼
Server Action → adapter.upload() → bucket
```

Hạn mức hiện tại:

| Policy | maxDimension | quality | targetBytes | maxUploadBytes | mỗi lần | mỗi cha |
|---|---|---|---|---|---|---|
| `ROOM_PHOTO_POLICY` | 1600 | 0.82 | 400 KB | 1536 KB | 10 | 12 |
| `ID_PHOTO_POLICY` | 1600 | **0.86** | 500 KB | 1536 KB | 2 | 2 |
| `PAYMENT_QR_POLICY` | **1000** | **0.92** | 250 KB | 1024 KB | 1 | 1 |
| `MAINTENANCE_PHOTO_POLICY` | 1600 | 0.82 | 400 KB | 1536 KB | 5 | 6 |

Ba con số lệch nhau đều có lý do ghi ngay trong file:

- **Ảnh CCCD chất lượng cao hơn (0.86)** vì phải *đọc được số* trên thẻ; bù lại chỉ có đúng
  hai tấm mỗi người.
- **Ảnh QR khác hẳn: 0.92 nhưng chỉ 1000px.** QR sống bằng cạnh sắc giữa ô đen và ô trắng;
  nén mạnh làm nhoè cạnh và máy quét đọc sai. 1000px thừa sức cho một mã QR vốn thường
  300–600px.
- **Ảnh báo hỏng để 0.82** — chỉ cần chủ trọ nhìn ra hỏng chỗ nào, không cần nét.

`maxInputBytes` chung là **25MB** — trên mức đó gần như chắc chắn là ảnh RAW hoặc không phải ảnh.

Chỉ chấp nhận `image/jpeg`, `image/png`, `image/webp`. **HEIC không có** — canvas không giải mã được.

Hai hàm dùng chung cho cả hai phía: `checkUploadFile(file, policy)` trả câu tiếng Việt hiện
thẳng cho người dùng (hoặc `null` nếu hợp lệ), và `acceptAttribute(policy)` dựng chuỗi cho
`<input accept>`.

`next.config.ts` cắt `deviceSizes` còn `[640, 828, 1080, 1600]` và `imageSizes` còn
`[64, 128, 220, 256, 384]`. Mặc định của Next là 15 biến thể cho **một** tấm ảnh, mỗi biến thể
lần đầu bị yêu cầu là một lần tải nguyên ảnh gốc về xử lý — trong khi gói free chỉ có 5GB
băng thông mỗi tháng.

## Thông báo

`src/lib/notify.ts` (329 dòng, `"server-only"`) là nơi duy nhất dựng thông báo. Mỗi thông báo
luôn ghi một hàng vào `notifications`; **gửi email là phần tuỳ chọn** — chỉ chạy khi
`isEmailConfigured` (cần cả `RESEND_API_KEY` lẫn `EMAIL_FROM`). Thiếu cấu hình email thì app
vẫn đủ dùng, chỉ là không có bản gửi vào hộp thư.

Tiếp: [05 — Feature slices](05-feature-slices.md)
