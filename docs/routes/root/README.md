[← Bản đồ route](../README.md) · [← Mục lục docs](../../README.md)

# File gốc của `src/app/`

Những file không thuộc route group nào nhưng chi phối mọi trang.

```
src/app/
├─ layout.tsx (89)        layout gốc
├─ error.tsx (48)         error boundary toàn cục  [client]
├─ not-found.tsx (32)     404
├─ manifest.ts (69)       → /manifest.webmanifest
├─ globals.css (364)      Tailwind v4 @theme + token màu
└─ icon.png · apple-icon.png · opengraph-image.png
```

---

## `layout.tsx` — layout gốc

```ts
components/common/nav-progress    NavProgress
components/common/service-worker  ServiceWorkerRegistration
components/common/theme           ThemeProvider
config/site                       houseConfig
```

| Việc | Ghi chú |
|---|---|
| `<html lang="vi">` + font | — |
| `ThemeProvider` | `next-themes`, thêm class `.dark` — token màu trong `globals.css` đổi theo |
| `NavProgress` | Thanh tiến trình mảnh trên đỉnh khi điều hướng |
| `ServiceWorkerRegistration` | Đăng ký `/sw.js?v=SW_VERSION`, **chỉ ở production** |
| `metadata` | Tiêu đề, mô tả, OG — đến từ `houseConfig` |

### `SW_VERSION` phải khớp tay

Hằng này nằm ở **hai** file: `public/sw.js:34` và `components/common/service-worker.tsx:16`
(dùng làm query string để ép trình duyệt tải lại). Sửa `sw.js` mà quên tăng số thì bản vá nằm
chờ trong cache. Xem [10](../../10-ra-soat-cau-truc.md#45).

---

## `error.tsx` — error boundary toàn cục

`"use client"` (bắt buộc với error boundary của Next). Nhận `error` + `reset`, hiện thông điệp
đọc được và nút thử lại.

**Không có `global-error.tsx`** — lỗi trong chính layout gốc sẽ rơi về màn hình mặc định của Next.

---

## `not-found.tsx` — 404

Trang 404 duy nhất, dùng chung cho cả bốn route group. Gõ thẳng `/admin/tenancies` (segment
không có `page.tsx`) cũng ra trang này.

---

## `manifest.ts` — PWA

Sinh `/manifest.webmanifest` từ `houseConfig`:

| Trường | Nguồn |
|---|---|
| `name` | `houseConfig.name` |
| `short_name` | `houseConfig.shortName` — **≤ ~11 ký tự**: Android cắt sau ~12, iOS sau ~11 |
| `icons` | `public/icons/` — sinh bằng `npm run icons` từ `assets/logo*.svg` |

Đường dẫn `/manifest.webmanifest` bị **loại khỏi matcher của proxy** (cùng `js|wasm`), vì trình
duyệt tải nó ngoài phiên đăng nhập. Để nó qua proxy thì khách chưa đăng nhập nhận HTML trang
`/login`, và nút "Cài đặt" không bao giờ hiện.

---

## `globals.css` — hệ màu và animation

```css
@import "tailwindcss";
@plugin "tailwindcss-animate";
@custom-variant dark (&:is(.dark *));

:root { /* token sáng */ }
.dark  { /* ghi đè đúng các token đó */ }
@theme inline { /* token → utility class */ }
```

Tailwind v4 nên **không có `tailwind.config.ts`**. Dùng token ngữ nghĩa (`text-destructive`,
`bg-muted`) thay vì màu thẳng (`text-red-500`) để chế độ tối tự đúng.

Ngoài ra:

| Khối | Dòng | Việc |
|---|---|---|
| `@keyframes` | 138–194 | `fade-in`, `slide-up`, `nav-progress-grow`, `link-hint-in`, `link-hint-pulse` |
| `@layer base` / `utilities` | 195–297 | Reset + tiện ích riêng |
| `@media (prefers-reduced-motion: reduce)` | 298 | Tắt animation |
| `@media print` | 319 | Bản in hoá đơn — ẩn nav, bỏ nền |

---

## `src/proxy.ts` — không nằm trong `app/`

Proxy của Next 16 (tên cũ: middleware) nằm ở `src/proxy.ts`, ngang cấp `app/`. Xem
[03-dinh-tuyen.md](../../03-dinh-tuyen.md#lớp-1--srcproxyts-chặn-lạc-quan).
