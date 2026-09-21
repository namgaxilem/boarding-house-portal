[← `(marketing)`](../README.md) · [← Bản đồ route](../../README.md) · [← Mục lục docs](../../../README.md)

# `/blog` và `/blog/[slug]` — Bài viết công khai

| | |
|---|---|
| File | `src/app/(marketing)/blog/page.tsx` · `src/app/(marketing)/blog/[slug]/page.tsx` |
| Guard | không — nhưng phải qua được `PUBLIC_PATH_PREFIXES` trong `src/proxy.ts` |
| Metadata | `/blog`: `export const metadata` tĩnh · `/blog/[slug]`: `generateMetadata` |
| Render | Server Component, Partial Prerender (`◐`) |
| Cờ bật/tắt | `houseConfig.features.publicBlog` — tắt thì cả hai trả 404 |

## Việc của trang

Chỉ liệt kê bài `status='published'` **và** `visibility='public'`. Bài nội bộ không bao giờ tới
đây — chúng chỉ hiện ở `/me/posts` cho người đã đăng nhập.

## Dữ liệu

| Nguồn | Hàm |
|---|---|
| `lib/db/public-posts` | `listPublicPosts(page)` · `getPublicPost(slug)` |

Cả hai nằm sau `"use cache"` + `cacheLife("hours")`, đọc bằng `createPublicClient()` (**không
cookie**) và chỉ chọn những cột đã cấp cho vai `anon`. Chi tiết: [13-bai-viet.md §3–4](../../../13-bai-viet.md).

`generateMetadata` và component trang cùng gọi `getPublicPost(slug)` — hai lần gọi, **một truy
vấn**, vì entry cache được đánh khoá theo hàm + tham số.

## Vỏ tĩnh, dữ liệu stream

`params` và `searchParams` là dữ liệu thời-điểm-yêu-cầu. Dưới Cache Components, `await` chúng ở
thân trang chặn prerender cả route và `next build` báo thẳng *"encountered uncached or runtime data
during prerendering"*. Nên cả hai trang giữ tiêu đề/nút quay lại ở ngoài và bọc phần đọc dữ liệu
trong `<Suspense>`.

Hệ quả: `/blog` **không** dùng `<Suspense key={page}>` như `/admin/invoices`, vì khoá đó đòi biết
`page` — tức là phải await `searchParams` ở đúng chỗ vừa nói là không được.

## JSON-LD

| Khối | Ở đâu |
|---|---|
| `BreadcrumbList` | cả hai trang |
| `BlogPosting` | `/blog/[slug]`, **trong** `<Suspense>` vì nó cần dữ liệu bài |

`BlogPosting` cố ý bỏ `articleBody` (Google đọc được ngay trong HTML), bỏ `dateModified` khi trùng
ngày với `datePublished`, và bỏ `image` khi bài không có ảnh bìa thật.

## Phân trang

10 bài/trang, `?page=`, `<Link>` Trước/Sau, `rel="prev|next"`. `page=1` không vào URL.
Sitemap chỉ liệt kê trang 1 và từng `/blog/<slug>`.

## Đi tiếp

`/blog/<slug>` ← → `/blog` ← → `/` (header và footer của `(marketing)`).
