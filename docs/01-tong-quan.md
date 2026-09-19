[← Mục lục](README.md)

# 01 — Tổng quan

## Dự án là gì

Cổng quản lý một nhà trọ 10 phòng. Hai nhóm người dùng:

- **Chủ trọ** (`role = "admin"`) — quản phòng, người thuê, hợp đồng, chỉ số điện nước,
  hoá đơn, báo hỏng, duyệt giấy tờ CCCD, cấu hình wifi và cách nhận tiền.
- **Người thuê** (`role = "tenant"`) — xem phòng của mình, hoá đơn, gửi báo hỏng,
  nộp giấy tờ, xem wifi và nội quy.

Cộng thêm một mặt tiền công khai (`/`, `/rooms`, `/contact`) để quảng cáo phòng trống.

## Stack

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Framework | Next.js **16.3**, App Router | `cacheComponents: true` + `partialPrefetching: true` |
| UI runtime | React **19.2.4** | Ghim đúng phiên bản, không dùng dải `^` |
| Kiểu dữ liệu | TypeScript 5.9, `strict: true` | 0 `any`, 0 `@ts-ignore` trong toàn bộ `src/` |
| Dữ liệu | Supabase — Postgres 17, Auth, Storage | Truy cập qua `@supabase/ssr` |
| Bảo mật dữ liệu | Row Level Security | RLS là ranh giới thật, không phải code app |
| Giao diện | Tailwind **v4** + Radix primitives | Không có `tailwind.config`; theme trong `src/app/globals.css` |
| Kiểm tra dữ liệu | Zod 4 | Một `schema.ts` mỗi feature slice |
| State client | zustand 5 | Chỉ UI state, không chứa dữ liệu domain |
| Test | vitest 3 | Chỉ hàm thuần trong `src/lib`, ép `TZ=UTC` |
| Ảnh | `next/image` + nén phía trình duyệt | `src/lib/image.ts` thu nhỏ trước khi tải lên |
| Quét CCCD | `BarcodeDetector` → `zxing-wasm` | Đọc mã QR trên thẻ, không OCR |

## Sáu nguyên tắc kiến trúc

### 1. `app/` chỉ chứa route

Mỗi file trong `src/app/` là một route thật. Logic nghiệp vụ nằm ở `src/features/<slice>/`.
Một trang thường chỉ làm ba việc: gọi guard, gọi `queries.ts`, render component.

### 2. Không trang nào biết chữ "supabase"

Tầng dữ liệu có hợp đồng: `src/lib/db/repository.ts` là interface, `supabase-adapter.ts` là
implementation, `src/lib/db/index.ts` nối đúng một dòng:

```ts
export const db: Repository = supabaseAdapter;
```

Đổi backend = viết adapter mới + sửa một dòng. Xem [04-tang-du-lieu.md](04-tang-du-lieu.md).

### 3. Bảo mật ba lớp, lớp ngoài cùng không phải lớp thật

```
proxy.ts          → chặn lạc quan, tránh nháy dashboard. KHÔNG phải ranh giới bảo mật.
requireAdmin()    → guard trong layout, đọc DB, chặn thật ở tầng app.
RLS trong Postgres → ranh giới cuối cùng. POST thẳng vào Server Action vẫn bị chặn ở đây.
```

Ghi rõ trong `src/proxy.ts:12-18`. Xem [03-dinh-tuyen.md](03-dinh-tuyen.md).

### 4. Một nguồn sự thật cho cấu hình nhà trọ

`src/config/site.ts` giữ tên, địa chỉ, liên hệ, số tài khoản, nội quy, đơn giá mặc định,
**múi giờ**. Cố ý **không** có bảng `settings` trong database — để không bao giờ có hai nơi
ghi hai giá trị khác nhau. `/admin/settings` chỉ hiển thị lại file này ở chế độ chỉ đọc.

Đánh đổi: đổi giá điện phải deploy lại.

### 5. Giới hạn tải ảnh gom về một file

Dự án chạy gói miễn phí Supabase (1GB Storage, 5GB băng thông/tháng). Một ảnh điện thoại
chưa nén là 3–6MB. `src/lib/upload-policy.ts` giữ toàn bộ hạn mức, và **cả trình duyệt lẫn
server đều đọc chính file đó** — vì vậy file này cố ý không `import "server-only"`.

### 6. Múi giờ theo nhà trọ, không theo máy chủ

`houseConfig.timeZone = "Asia/Ho_Chi_Minh"`. Vercel và phần lớn container chạy UTC; thiếu
chỗ này thì hoá đơn phát hành 09:00 hiện thành 02:00. Test ép `TZ=UTC` (`vitest.config.ts:19`)
chính là để bug lệch 7 tiếng lộ ra trên máy lập trình viên vốn đã ở UTC+7.

## Luồng một request

```
Trình duyệt
   │
   ▼
src/proxy.ts                    làm mới session Supabase; chặn lạc quan route riêng tư
   │                            (không bao giờ truy vấn DB → rẻ trên mọi request)
   ▼
src/app/(admin)/layout.tsx      requireAdmin() → getCurrentUser() → db.getProfile()
   │                            cache() của React gộp mọi lần hỏi trong một lượt render
   ▼
src/app/(admin)/admin/.../page.tsx
   │                            gọi features/<slice>/queries.ts
   ▼
src/features/<slice>/queries.ts   "server-only"; gọi db.*
   │
   ▼
src/lib/db/index.ts  →  supabase-adapter.ts  →  @supabase/ssr  →  Postgres (RLS)
```

Ghi dữ liệu đi hướng ngược lại qua Server Action:

```
<form action={serverAction}>
   │
   ▼
src/features/<slice>/actions.ts    "use server"
   │  1. requireAdmin() / requireUser()
   │  2. schema.parse(formData)      → Zod
   │  3. db.<method>(input)
   │  4. revalidatePath() / redirect()
   ▼
ActionResult  { ok: true, data } | { ok: false, error, fieldErrors }
```

## Số liệu

| Chỉ số | Giá trị |
|---|---|
| File git-tracked | 256 |
| File `.ts` / `.tsx` trong `src/` | 208 |
| Tổng dòng `src/` | ~26.800 |
| Migration SQL | 12 file, 2.233 dòng |
| Bảng Postgres | 20 |
| Enum Postgres | 13 |
| Route | 4 route group, 5 dynamic segment, 6 route handler |
| Feature slice | 14 |
| Method trên `Repository` | 98 |
| File `"use client"` | 49 |
| File `"use server"` | 13 |

Tiếp: [02 — Cây thư mục](02-cay-thu-muc.md)
