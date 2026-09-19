[← Mục lục](README.md)

# 03 — Định tuyến & phân quyền

## Route group

Bốn group, mỗi group một `layout.tsx` riêng. Dấu ngoặc nghĩa là **không** xuất hiện trong URL.

| Group | URL | Ai vào được | Layout làm gì |
|---|---|---|---|
| `(marketing)` | `/`, `/rooms`, `/contact` | Tất cả | Header công khai + link đăng nhập |
| `(auth)` | `/login`, `/forgot-password`, `/reset-password` | Chưa đăng nhập | Khung hẹp, căn giữa |
| `(admin)` | `/admin/**` | `role = "admin"` | Gọi `requireAdmin()`, dựng sidebar + nav mobile |
| `(tenant)` | `/me/**` | Đã đăng nhập | Gọi `requireUser()`, dựng bottom nav |

`/` do `(marketing)/page.tsx` sở hữu — **không có** `src/app/page.tsx`.

## Dynamic segment

Năm cái, tất cả một tham số, đặt tên `[camelCase]`:

```
/admin/invoices/[invoiceId]        /admin/rooms/[roomId]
/admin/maintenance/[requestId]     /admin/tenants/[tenantId]
/admin/tenancies/[tenancyId]/checkout
/me/invoices/[invoiceId]           /me/maintenance/[requestId]
```

Không có catch-all `[...x]`, optional `[[...x]]`, parallel `@slot` hay intercepting `(.)`.

## Ba lớp bảo vệ

Thứ tự từ ngoài vào trong. **Lớp ngoài cùng không phải lớp bảo mật.**

### Lớp 1 — `src/proxy.ts` (chặn lạc quan)

Next 16 đổi tên `middleware` thành `proxy`. File này làm đúng hai việc:

1. Làm mới session Supabase (access token có xoay vòng).
2. Đá khách chưa đăng nhập về `/login?next=<đường dẫn>` để không nháy dashboard.

Nó **không bao giờ truy vấn database** — vì vậy rẻ trên mọi request. Đó cũng là lý do
kiểm tra `role` nằm ở layout chứ không nằm đây: đọc `role` sẽ tốn một round-trip mỗi request.

```ts
// src/proxy.ts:12-18 — ghi thẳng trong code
// This is NOT the security boundary. requireAdmin() in the layouts and RLS in
// the database are what actually protect data — a proxy check can be bypassed
// by POSTing to a Server Action directly.
```

Đường đi qua tự do:

```ts
PUBLIC_PATHS    = { "/", "/rooms", "/contact", "/login", "/forgot-password", "/reset-password" }
PUBLIC_PREFIXES = [ "/api/health", "/api/cron", "/auth" ]
```

**Matcher có phần thêm cho PWA.** Đuôi `js|wasm|webmanifest` được loại khỏi matcher vì
`/sw.js`, `/zxing_reader.wasm` và `/manifest.webmanifest` bị trình duyệt tải **trước hoặc
ngoài** phiên đăng nhập. Nếu để chúng qua proxy, khách chưa đăng nhập nhận về HTML trang
`/login`, service worker không đăng ký được, nút "Cài đặt" không bao giờ hiện — và lỗi thì im lặng.

**Vòng lặp chuyển hướng và cờ `?expired=1`.** Nếu cookie còn hợp lệ về cấu trúc nhưng tài
khoản đã bị xoá hoặc khoá, app đá người dùng về `/login?expired=1`; proxy thấy cờ này thì
**xoá sạch cookie `sb-*`** rồi để trang login render. Không có cờ đó, proxy sẽ thấy "đã đăng
nhập", đá ngược lại, và hai bên chuyển hướng lẫn nhau vô hạn.

### Lớp 2 — `requireAdmin()` / `requireUser()` (`src/lib/auth/dal.ts`)

Data Access Layer. Mọi lần đọc "ai đang đăng nhập" ở phía server đều đi qua đây.

```ts
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => { … });
export async function requireUser(): Promise<SessionUser>   // chưa đăng nhập → /login?expired=1
export async function requireAdmin(): Promise<SessionUser>  // không phải admin → HOME_PATH.tenant
```

Ba điểm đáng nhớ:

- **`cache()` của React** gộp mọi lần hỏi trong một lượt render: layout, page và ba component
  con cùng hỏi chỉ tốn một lần tra cứu.
- **Dùng `getUser()`, không dùng `getSession()`.** `getUser()` xác minh lại JWT với Auth
  server. `getSession()` chỉ đọc cookie và sẽ tin một cookie giả — không bao giờ dùng nó để
  phân quyền.
- **Database là nơi nói lời cuối.** Sau khi lấy user, `dal.ts` vẫn đọc `profile` và trả `null`
  nếu `!profile.isActive`. Hạ quyền hay khoá tài khoản có hiệu lực ngay ở request kế tiếp,
  không phải chờ token hết hạn.

**`await connection()` đặt trong `requireUser`, không đặt trong `getCurrentUser`.** Client
Supabase kiểm hạn token bằng `Date.now()`. Dưới `cacheComponents`, Next cố prerender, gặp giá
trị đó thì dừng và ghi `blocking-prerender-current-time` — một dòng ERROR cho **mọi** lần vào
**mọi** trang có guard. Đặt trong `getCurrentUser` không ăn thua vì hàm đó bọc `cache()`: từ
lượt render thứ hai nó trả promise đã ghi nhớ và `connection()` không chạy nữa.

### Lớp 3 — RLS trong Postgres

`supabase/migrations/20260804000002_rls.sql` + policy rải trong các migration sau. Đây là
ranh giới thật: POST thẳng vào Server Action, hay gọi PostgREST bằng anon key, vẫn bị chặn ở đây.

Xem [04-tang-du-lieu.md](04-tang-du-lieu.md).

## Route handler

Sáu file `route.ts`, tất cả chỉ export `GET`.

| Đường dẫn | Bảo vệ | Việc |
|---|---|---|
| `/api/health` | công khai | Kiểm tra sống, cho uptime monitor |
| `/api/cron/keep-alive` | `CRON_SECRET` | Ping để project Supabase free không bị tự ngủ |
| `/api/cron/invoice-reminders` | `CRON_SECRET` | Gửi nhắc hoá đơn sắp/đã quá hạn |
| `/auth/callback` | — | Đổi mã PKCE của Supabase lấy session |
| `/auth/zalo` | — | Bắt đầu OAuth Zalo, đặt cookie state |
| `/auth/zalo/callback` | cookie state | Nhận kết quả Zalo, tạo/liên kết tài khoản |

`src/lib/cron-auth.ts` so `CRON_SECRET` kiểu **timing-safe**. Thiếu biến → trả **503**
(fail-closed), không phải mở toang.

## Chuyển hướng sau đăng nhập

`HOME_PATH` trong `src/lib/constants.ts:203`:

```ts
export const HOME_PATH: Record<Role, string> = { admin: "/admin", tenant: "/me" };
```

Sau khi đăng nhập, `safeNext()` quyết định đi đâu: nhận `?next=` nếu đó là đường dẫn nội bộ
(`startsWith("/")` và `!startsWith("//")`), ngược lại rơi về `HOME_PATH[role]`.

> ⚠️ `safeNext()` hiện **được cài hai lần**, chữ ký khác nhau, ở `features/auth/actions.ts:22`
> và `features/auth/oauth-actions.ts:19`. Xem [10-ra-soat-cau-truc.md](10-ra-soat-cau-truc.md#45).

## Điều hướng và Cache Components

`next.config.ts` bật hai cờ đi kèm nhau:

```ts
cacheComponents: true,      // dữ liệu dynamic mặc định; muốn cache thì đánh dấu `use cache`
partialPrefetching: true,   // prefetch một "App Shell" chung cho mỗi route
```

`partialPrefetching` **yêu cầu** `cacheComponents` — bỏ một cái mà giữ cái kia thì `next build`
lỗi ngay ở bước đọc config.

Lợi ích cụ thể: trang danh sách phòng có 10 link trỏ về cùng một route động. Trước là 10 lần
tải prefetch, giờ là 1.

`experimental.useOffline` **cố ý tắt** — cờ đó giữ request thất bại ở trạng thái chờ rồi tự
chạy lại; giao diện khi đó đứng im, không phân biệt được với treo, và người dùng không huỷ được.

## Skeleton và Suspense

Repo **không có file `loading.tsx` nào**. Skeleton được khai trực tiếp trong route file và đặt
vào `<Suspense fallback={…}>` quanh phần cần dữ liệu. Cách này cho phép mỗi trang chọn đúng
hình dạng skeleton cho phần động của nó, thay vì một fallback chung cho cả route.

Đánh đổi: hiện có **18 component `*Skeleton`** rải trong `app/`, trong đó 10 cái gần như
trùng nhau. Xem [10-ra-soat-cau-truc.md](10-ra-soat-cau-truc.md#46).

## Điều hướng phía client

| File | Việc |
|---|---|
| `components/common/link.tsx` | Bọc `next/link`, thêm `LinkPendingDot` báo đang tải |
| `components/common/nav-progress.tsx` | Thanh tiến trình mảnh trên đỉnh trang |
| `components/layout/nav-items.ts` | `ADMIN_NAV`, `TENANT_NAV`, `TENANT_SECONDARY`, `isActive()` |

`NavItem.badge` chỉ gắn cho ba mục — giấy tờ chờ duyệt, báo hỏng đang mở, mã cổng cần thu hồi.
Lý do ghi trong `nav-items.ts:22-31`: hai cái đầu là việc **người khác** tạo ra cho chủ trọ,
cái thứ ba là việc **hệ thống** phát hiện. Gắn số đỏ vào mục chủ trọ tự chủ động vào làm chỉ
dạy người ta bỏ qua huy hiệu.

Tiếp: [04 — Tầng dữ liệu](04-tang-du-lieu.md)
