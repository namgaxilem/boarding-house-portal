[← Mục lục](README.md)

# 07 — Quy ước

## Đặt tên

Quét toàn bộ `src/` không ra ngoại lệ nào cho các quy tắc dưới đây.

| Phạm vi | Quy ước | Ví dụ |
|---|---|---|
| File `.ts` / `.tsx` | **kebab-case** | `payment-manager.tsx`, `upload-policy.ts`, `id-scanner.tsx` |
| Thư mục trong `src/` | **kebab-case** | `forgot-password/`, `invoice-reminders/`, `keep-alive/` |
| Route group | `(chữ-thường)` | `(admin)`, `(auth)`, `(marketing)`, `(tenant)` |
| Dynamic segment | `[camelCase]` | `[invoiceId]`, `[roomId]`, `[tenancyId]` |
| Component React | **PascalCase** | `PageHeader`, `AdminSidebar`, `StatCard` |
| Hàm, biến, thuộc tính type | **camelCase** | `formatVND`, `requireAdmin`, `basePrice` |
| Hằng số export | **SCREAMING_SNAKE** | `ADMIN_NAV`, `ROOM_PHOTO_POLICY`, `HOME_PATH` |
| Zod schema | `camelCaseSchema` | `loginSchema`, `invoiceSchema`, `checkInSchema` |
| Test | `<tên>.test.ts`, đặt cạnh file gốc | `format.test.ts` nằm cạnh `format.ts` |
| Migration SQL | `YYYYMMDDNNNNNN_snake_case.sql` | `20260904000010_ttlock_gate.sql` |
| Cột database | `snake_case` | `base_price`, `electric_start`, `created_at` |

## Ranh giới server / client

Ba chỉ thị, ba ý nghĩa khác nhau:

| Chỉ thị | Đặt ở | Số file |
|---|---|---|
| `"use client"` | Đầu file component cần state / event / API trình duyệt | 49 |
| `"use server"` | Đầu file `actions.ts` | 13 |
| `import "server-only"` | Đầu module **không được** lọt vào bundle client | `queries.ts`, `lib/db/*`, `lib/auth/*`, `email.ts`, `notify.ts`, `cron-auth.ts`, `supabase/{server,admin,proxy}.ts` |

**Ngoại lệ đáng nhớ:** `lib/upload-policy.ts` **cố ý không** có `server-only`. Cả trình duyệt
(để báo lỗi sớm) lẫn server (chốt chặn thật) phải đọc chính file đó — đây là toàn bộ lý do nó
tồn tại.

Mặc định là **server**. Một component chỉ thành client khi thật sự cần, và khi đó nó được đẩy
xuống càng sâu càng tốt để phần tĩnh quanh nó vẫn render trên server.

## Form

App **không dùng thư viện form** — không react-hook-form, không formik. Mẫu chuẩn:

```tsx
<form action={formAction}>
  <Field label="Mã phòng" name="code" errors={fieldErrorsOf(state, "code")} />
  <FormMessage state={state} />
  <SubmitButton>Lưu</SubmitButton>
</form>
```

- `formAction` đến từ `useActionState(serverAction, null)`.
- `Field`, `SubmitButton`, `FormMessage`, `fieldErrorsOf` ở
  [`components/common/form.tsx`](../src/components/common/form.tsx).
- Kiểm tra dữ liệu chạy **trên server** bằng Zod; lỗi quay về qua `ActionResult.fieldErrors`.
- `SubmitButton` tự khoá khi `useFormStatus().pending`.

Hệ quả: form vẫn hoạt động khi JavaScript chưa tải xong.

## Xử lý lỗi

Ba tầng, mỗi tầng một dạng:

```
Adapter (lib/db/)     ném Error có message là MÃ LỖI:  throw new Error("ROOM_OCCUPIED")
      ▼
Action (features/)    bắt lại → describeError(error, fallback) → fail(message)
      ▼
UI                    <FormMessage> hiện câu tiếng Việt
```

Không bao giờ để lỗi database rơi thẳng ra giao diện. Mã lỗi mới → thêm một dòng vào bảng
`messages` trong [`lib/action-result.ts`](../src/lib/action-result.ts).

## Thao tác phá huỷ

Luôn đi qua `ConfirmForm` (`components/common/confirm-form.tsx`), không phải `<button onClick>`:

```tsx
<ConfirmForm
  action={deleteRoom}
  title="Xoá phòng này?"
  triggerLabel={<><Trash2Icon />Xoá</>}
  triggerProps={{ size: "sm", className: "text-destructive hover:bg-destructive/10" }}
/>
```

## Chú thích

Repo này chú thích **nhiều hơn** mức thông thường, và theo một kiểu nhất quán: giải thích
**tại sao**, không giải thích *cái gì*. Vài ví dụ đúng tinh thần đó:

- `next.config.ts:80-88` giải thích tại sao **không** đặt `minimumCacheTTL`.
- `lib/auth/dal.ts:52-66` giải thích tại sao `await connection()` phải nằm trong `requireUser`
  chứ không nằm trong `getCurrentUser`.
- `public/sw.js:18-26` giải thích tại sao không bao giờ được cache HTML của trang đã đăng nhập.
- `components/layout/nav-items.ts:22-31` giải thích tại sao chỉ ba mục nav có huy hiệu.
- `vitest.config.ts:16-18` giải thích tại sao ép `TZ=UTC`.

Mật độ chú thích cao nhất: `config/site.ts` 52%, `features/dashboard/queries.ts` 48%,
`components/common/service-worker.tsx` 46%, `lib/env.ts` 44%.

**Ngôn ngữ chú thích hiện đang lẫn.** Phần lớn tiếng Việt; bảy file tiếng Anh
(`lib/db/index.ts`, header `lib/db/repository.ts`, `lib/supabase/{server,admin,proxy}.ts`,
`stores/room-filter-store.ts`, `app/api/cron/keep-alive/route.ts`). `src/proxy.ts` lẫn cả hai
trong một doc block. Xem [10-ra-soat-cau-truc.md](10-ra-soat-cau-truc.md#48).

## Kỷ luật type

| Chỉ số | Số lượng |
|---|---|
| `any` (mọi dạng) | **0** |
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | **0** |
| `prettier-ignore` | **0** |
| `eslint-disable` | **3** |
| `as unknown as` (double cast) | 3 |
| Rule bị tắt trong `eslint.config.mjs` | **0** |
| `TODO` / `FIXME` / `HACK` / `XXX` | **0** |

Ba `eslint-disable` đều là `@next/next/no-img-element`, ở
`features/identity/components/id-photos.tsx:45`, `…/id-scanner.tsx:473`,
`features/payments/components/payment-manager.tsx:415` — ảnh signed-URL và blob không đi qua
`next/image` được.

`tsconfig.json` bật `strict: true`. **Chưa** bật `noUncheckedIndexedAccess`, `noUnusedLocals`,
`noUnusedParameters`.

## Giao diện

### Token màu

`src/app/globals.css` định nghĩa token ở `:root` (sáng) và `.dark` (tối), rồi ánh xạ sang
Tailwind qua `@theme inline`. Tailwind v4 nên **không có `tailwind.config.ts`**.

```css
@import "tailwindcss";
@plugin "tailwindcss-animate";
@custom-variant dark (&:is(.dark *));

:root { --background: …; --foreground: …; --destructive: …; … }
.dark  { /* ghi đè đúng các token đó */ }

@theme inline { /* token → utility class của Tailwind */ }
```

Không viết màu thẳng (`text-red-500`) — dùng token ngữ nghĩa (`text-destructive`,
`bg-muted`, `border-input`) để chế độ tối tự đúng.

### Animation và khả năng tiếp cận

`globals.css` có `@keyframes` riêng (`fade-in`, `slide-up`, `nav-progress-grow`,
`link-hint-in`, `link-hint-pulse`), một khối `@media (prefers-reduced-motion: reduce)` tắt
chúng, và một khối `@media print` cho bản in hoá đơn.

### Nhãn cho enum

Mỗi enum có nhãn tiếng Việt + class Tailwind trong `src/lib/constants.ts`, không rải trong
component:

```ts
ROOM_STATUS_LABEL   ROOM_STATUS_STYLE   ROOM_STATUS_DOT   ROOM_STATUS_OPTIONS
INVOICE_STATUS_LABEL   INVOICE_STATUS_STYLE   …
MAINTENANCE_STATUS_LABEL   MAINTENANCE_PRIORITY_LABEL   …
```

## Test

`vitest.config.ts` giới hạn phạm vi rất hẹp, và có lý do ghi trong file:

```ts
include: ["src/lib/**/*.test.ts"],
environment: "node",
env: { TZ: "UTC" },
```

> *"Cố ý không dựng môi trường jsdom và không test component: đây là nhà trọ mười phòng, và
> thứ đáng test là những hàm mà sai một chỗ thì người thuê bị tính sai tiền — không phải việc
> một cái thẻ có đúng class Tailwind hay không."*

Năm bộ test: `format`, `period`, `cccd`, `gate`, `image`.

`TZ=UTC` ép tiến trình lệch hẳn khỏi Việt Nam để test chứng minh hiển thị bám
`houseConfig.timeZone` chứ không bám máy chủ. Chạy trên máy đã UTC+7 thì bug lệch 7 tiếng không
bao giờ lộ ra.

Tiếp: [08 — Cấu hình](08-cau-hinh.md)
