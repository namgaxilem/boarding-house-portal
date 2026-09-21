[← Mục lục](README.md)

# 13 — Bài viết

Một bảng, hai khán giả. Người đã đăng nhập viết bài; **chủ trọ là người duy nhất đăng được**, và
cũng là người duy nhất quyết bài nào ra công khai.

```
Người thuê viết ──► nháp ──► chờ duyệt ──┬──► đang hiện (nội bộ | công khai)
                      ▲                  │
                      └── bị từ chối ◄───┘
Chủ trọ viết ──────► nháp ──────────────────► đang hiện        (không qua hàng chờ)
                                                  │
                                                  └──► đã gỡ ──► (đăng lại được)
```

## 1. `visibility` — hai khán giả, một bảng

| Giá trị | Ai đọc được | SEO |
|---|---|---|
| `internal` | chỉ người đã đăng nhập | thừa hưởng `robots: noIndex` của layout gốc |
| `public` | cả khách vãng lai | vào `/blog`, vào sitemap, Google lập chỉ mục |

Mặc định là **`internal`**, cùng chiều với nguyên tắc "cấm trước, mở sau" của
[12-seo.md](12-seo.md): quên khai thì bài **không** lên Google, chứ không im lặng lọt vào.

**Người thuê không bao giờ đặt được `public`.** Đó không phải một ô bị ẩn trong giao diện — nó là
một vế trong `WITH CHECK` của policy `posts_insert_own`, nên POST thẳng vào PostgREST cũng bị từ
chối. Bài nào ra internet là quyết định biên tập.

## 2. Chốt chặn nằm ở đâu

Server Action là một endpoint POST công khai (`src/proxy.ts:14-19` đã ghi). Nên mọi ràng buộc thật
đều ở database:

| Ràng buộc | Ép ở | Mã lỗi |
|---|---|---|
| Không tự đăng, không tự công khai | `posts_insert_own` / `posts_update_own` WITH CHECK | RLS từ chối |
| 1 bài chờ duyệt mỗi tác giả | unique index `posts_one_pending_per_author` | `POST_PENDING_EXISTS` |
| 3 bài/24h (chủ trọ 20) | trigger `posts_enforce_quota` | `POST_DAILY_LIMIT` |
| 5 bài chưa đăng (chủ trọ 20) | cùng trigger | `POST_BACKLOG_FULL` |
| Thân bài 20–20.000 ký tự | CHECK `posts_body_len` | `POST_BODY_TOO_LONG` |
| Từ chối phải có lý do ≥5 ký tự | CHECK + `reject_post()` | `POST_NOTE_REQUIRED` |
| 4 ảnh, 1,5MB mỗi bài, 256MB cả bucket | trigger `post_images_enforce_quota` | `POST_IMAGE_*` |
| Slug không đổi sau khi đăng | trigger `posts_guard_update` | `POST_SLUG_LOCKED` |

Bốn bước chuyển trạng thái (`approve_post`, `reject_post`, `publish_post`, `archive_post`) là RPC
`SECURITY DEFINER` có `for update` — hai tab admin cùng bấm Duyệt thì tab thứ hai chờ rồi đọc lại
trạng thái mới, thay vì ghi đè `reviewed_by` và `published_at` của tab thứ nhất. Cùng khuôn với
`approve_id_document()`.

### Hạn mức ảnh đọc kích thước THẬT

`post_images_enforce_quota()` không tin cột `bytes` client gửi lên — nó đọc lại
`storage.objects.metadata->>'size'`. Hệ quả về thứ tự: **file phải lên bucket trước, dòng ghi sau**.
Chưa có file thì trigger ném `POST_IMAGE_NOT_UPLOADED`.

## 3. `anon` được cấp quyền — lần đầu tiên trong app

`20260804000003_grants.sql` ghi "anon không được cấp quyền trên bất kỳ bảng nào". `posts` là ngoại
lệ đầu tiên, và ngoại lệ đó cấp **theo cột**:

```sql
-- migration 0015 — THU HỒI trước, rồi mới cấp
revoke all on public.posts from anon;
grant select (id, slug, title, excerpt, body, cover_path,
              author_name, published_at, updated_at, status, visibility)
  on public.posts to anon;
```

> ⚠️ **`revoke` là bắt buộc, không phải cho sạch.** Supabase cấu hình
> `alter default privileges in schema public grant all on tables to anon, authenticated,
> service_role`, nên mọi bảng mới sinh ra đã có `anon=arwdDxtm` — tức `anon` đã có SELECT **cấp
> bảng**, và quyền cấp bảng phủ mọi cột. Thêm một `grant select (cột…)` lên trên đó là lệnh không
> làm gì cả. Migration 0013 mắc đúng lỗi này và 0015 vá lại; kiểm chứng bằng
> `select relacl from pg_class where oid = 'public.posts'::regclass`, phải thấy `anon=r/postgres`
> chứ không phải `anon=arwdDxtm/postgres`.
>
> Mọi bảng KHÁC trong project vẫn mang bộ quyền mặc định đó. Đấy là mô hình chuẩn của Supabase và
> của repo này — RLS là ranh giới thật ([03](03-dinh-tuyen.md)) — nên 0015 cố ý chỉ đụng hai bảng
> của tính năng này, là chỗ mà thiết kế đã hứa một điều nó chưa làm được.

Lý do phải làm vậy: **RLS lọc dòng, không lọc cột.** Policy `posts_select_anon` giới hạn đúng những
bài đã đăng và công khai, nhưng trong mỗi dòng đó thì mọi cột đều đọc được — kể cả `review_note`,
câu chủ trọ viết riêng cho tác giả.

> ⚠️ **Hệ quả bắt buộc nhớ:** đường đi công khai trong adapter **không được `select("*")`**. Postgres
> từ chối cả câu ngay khi chạm một cột chưa cấp. Dùng `POST_PUBLIC_SELECT`, tách hẳn khỏi
> `POST_SELECT`.

Vì sao không dùng RPC kiểu `vacant_rooms()`? RPC đó tồn tại vì lý do *đúng sai*: "phòng trống" được
**suy ra** từ `tenancies`, bảng anon không bao giờ được đọc. Ở đây không có suy diễn — "bài này công
khai không" là hai cột nằm ngay trên dòng. Thêm nữa, phân trang và tra theo slug compose miễn phí
trên một bảng, còn trên RPC thì mỗi biến thể là một tham số mới.

## 4. `"use cache"` — chỗ đầu tiên repo dùng

`src/lib/db/public-posts.ts` bọc ba hàm đọc công khai trong `"use cache"` + `cacheLife("hours")`.

Khác React `cache()` (đang dùng ở `public-rooms.ts`): `cache()` gộp các lần gọi **trong một lượt
render**, `"use cache"` giữ kết quả **qua nhiều request**. Googlebot cùng mười khách vãng lai phải
dùng chung một truy vấn, không phải mười một.

**Điều kiện:** bên trong không được chạm `cookies()`, `headers()` hay `Date.now()`. `createClient()`
mặc định của repo đọc cookie, nên các hàm `...Public...` trong adapter dùng `createPublicClient()`
(`lib/supabase/server.ts`) — và đó chính là lý do §3 chọn GRANT cho anon thay vì RPC. Hai quyết định
này gánh nhau.

**Làm mới đi qua `updateTag`, KHÔNG qua `revalidatePath`.** Một entry `"use cache"` được đánh khoá
theo hàm + tham số; `revalidatePath("/blog")` không chạm tới nó. Thiếu bước này thì bài vừa duyệt
chưa hiện cho tới một tiếng sau và không có gì báo lỗi. Dùng `updateTag` chứ không `revalidateTag`
vì đây là đọc-lại-thứ-mình-vừa-ghi: chủ trọ bấm Duyệt rồi mở `/blog` ngay trong giây sau.

## 5. Định dạng nội dung — không có thư viện Markdown

`src/lib/rich-text.ts` trả về một **cây dữ liệu**; `post-body.tsx` biến cây đó thành phần tử React;
React tự escape mọi chuỗi. Không có `dangerouslySetInnerHTML` ở đâu cả.

Người thuê gõ `<script>alert(1)</script>` thì nhìn thấy đúng chuỗi ký tự đó. **Không có gì để
sanitize vì không có gì từng được hiểu là HTML.** So với `react-markdown` + `rehype-sanitize`: bốn
dependency và một danh sách cho phép phải nuôi, để phục vụ một chủ trọ và mười người thuê viết
"Thông báo cắt nước ngày 12/10".

Cú pháp: `## h2`, `### h3`, khối toàn dòng `- ` thành danh sách, khối toàn dòng `>` thành trích dẫn,
còn lại là đoạn văn với xuống dòng đơn giữ nguyên.

Quy tắc "**mọi** dòng" cho danh sách là cố ý: tiếng Việt mở lời thoại bằng `- ` rất nhiều, nên một
gạch đầu dòng lẫn trong văn xuôi phải vẫn là văn xuôi.

URL chỉ vào được kết quả qua một đường duy nhất — hàm dò link trần, và nó kiểm lại bằng `new URL()`
+ so protocol. `javascript:`, `data:`, `vbscript:`, `file:` không có cửa. Cú pháp `[chữ](url)` **cố
ý không nhận**: nó mời người ta giấu đích đến. Link ngoài luôn mang `rel="nofollow ugc noopener"`.

## 6. Slug

`src/lib/slug.ts`. `Đ`/`đ` phải xử lý riêng — U+0110 và U+0111 **không có canonical decomposition**,
nên `normalize("NFD")` không đụng tới chúng và "Điện nước" ra `in-nc`. Lỗi đó vô hình lúc đọc code và
vĩnh viễn khi URL đã phát ra ngoài.

**Slug đóng băng kể từ lần đăng đầu tiên.** App không có bảng chuyển hướng và `next.config.ts` không
khai `redirects()` — đổi slug là 404 mọi link đã chia sẻ, mọi dòng sitemap, mọi mục trong chỉ mục
Google. Trigger `posts_guard_update` ném `POST_SLUG_LOCKED` chứ không ghim im lặng: đây là thứ người
dùng cố ý làm và cần biết vì sao không được.

Cùng lý do đó, gỡ bài là `archived` chứ không `delete`: dòng ở lại giữ chỗ cho slug.

## 7. Bốn chỗ phải khớp nhau

Thêm một trang công khai mới thì sửa **cả bốn**, lệch nhau là hỏng lặng lẽ:

1. `src/proxy.ts` — `PUBLIC_PATHS` cho đường dẫn cố định (`/blog`), **`PUBLIC_PATH_PREFIXES`** cho
   phần động (`/blog/<slug>`).
2. `src/app/sitemap.ts`.
3. Đặt trang dưới `(marketing)/` để thừa hưởng `robots: indexable`.
4. `src/app/robots.ts` — `/blog` đã nằm trong `allow: "/"`, không cần sửa.

> ⚠️ **`PUBLIC_PATH_PREFIXES` KHÁC `PUBLIC_PREFIXES`.** Nhánh `PUBLIC_PREFIXES` ở `proxy.ts:43`
> return sớm và **bỏ qua `updateSupabaseSession()`** — đúng cho `/api/cron` và `/auth` vì chúng
> không có phiên nào để làm mới. Nhưng bài viết thì người đã đăng nhập cũng đọc, và nếu request của
> họ không đi qua bước làm mới thì access token ngừng xoay vòng giữa chừng, rồi ô đăng nhập trên
> header lật về "Đăng nhập". Danh sách mới chỉ tham gia vào quyết định `isPublic`, không cắt ngắn
> đường đi.

## 7b. `/blog/[slug]` là route CHẶN, không phải Partial Prerender

`export const instant = false`, và đó là một đánh đổi có chủ ý.

Bọc `<Suspense>` quanh phần đọc dữ liệu (cách mà `/blog` dùng) cho vỏ trang ra trước — nhưng khi đó
HTTP status đã gửi đi rồi, nên `notFound()` bên trong boundary chỉ đổi được **nội dung**, không đổi
được **mã trạng thái**. Đo thật: `/blog/khong-ton-tai` trả **200** kèm trang "không tìm thấy".

Với một trang mà toàn bộ lý do tồn tại là để Google đọc, đó là soft-404 — Google lập chỉ mục mọi
đường dẫn rác ai đó dán vào. Nên trang này chặn để trả đúng 404. Mất mát nhỏ: phần đọc dữ liệu vốn
đã nằm sau `"use cache"` một tiếng.

`/blog` (danh sách) thì ngược lại — không có khái niệm "không tìm thấy", nên nó giữ
`instant = true` và stream danh sách.

## 8. Phân trang — lần đầu trong repo

`/blog` là bảng đầu tiên mà số dòng **không bị chặn bởi ngôi nhà**: 10 phòng → 10 dòng, 15 người
thuê → 15 dòng, nhưng bài viết mọc mãi. Nó cũng là danh sách duy nhất khách vãng lai và Googlebot
cùng tải, nên là chỗ duy nhất "lấy hết" biến thành hoá đơn băng thông trên trần 5GB/tháng.

10 bài mỗi trang, `.range()` trong adapter (**lần đầu tiên trong file đó**), hai link Trước/Sau bằng
`<Link>`, không JavaScript. `page=1` không xuất hiện trong URL — để nó xuất hiện là `/blog` và
`/blog?page=1` thành hai địa chỉ cho cùng một nội dung.

`/me/posts` và `/admin/posts` **không** phân trang: hàng chờ đã bị chặn bởi
`posts_one_pending_per_author`.

## 9. Ảnh

Bucket `post-images`, **CÔNG KHAI** — giống `room-photos`, không giống `maintenance-photos`. Blog là
để công bố: ảnh bìa phải vào được `og:image` và `next/image` với cache một năm, mà URL ký hạn 10
phút thì thẻ chia sẻ Zalo chết sau mười phút.

> Đánh đổi, và ô tải ảnh nói thẳng câu này cho người dùng: ảnh đính vào một bài **nội bộ** vẫn mở
> được nếu ai đó đoán trúng uuid. Đừng đính ảnh riêng tư.

`POST_IMAGE_POLICY`: 1280px / q 0.8 / mục tiêu 250KB / trần 900KB / 4 ảnh mỗi bài. 1280 chứ không
1600 như ảnh phòng vì cột chữ của trang blog rộng tối đa ~768px CSS.

Ảnh đầu tiên tải lên tự thành ảnh bìa nếu bài chưa có — để trống nghĩa là thẻ chia sẻ hiện logo thay
vì ảnh thật, và gần như không ai vào đặt bìa bằng tay.

## 10. Còn thiếu

- **Không có phân loại / thẻ.** Thêm khi có đủ bài để phân loại.
- **Không có `generateStaticParams`** cho `/blog/[slug]` — nó cần đọc DB lúc build (không có phiên
  Supabase lúc đó) và ghim tập bài vào thời điểm deploy. Entry cache một tiếng tốt hơn.
- **Không có tìm kiếm trong bài.** Cùng giới hạn với phần còn lại của app.
- **`supabase-adapter.ts` phình thêm ~330 dòng.** Nhóm `posts` vẫn nằm trong file chung theo đúng
  quy ước domain của nó; việc tách file ([10 §5 mục 7](10-ra-soat-cau-truc.md)) chưa làm.

---

Quay lại [mục lục](README.md).
