[← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/posts` — Bài viết của tôi

| | |
|---|---|
| File | `page.tsx` · `new/page.tsx` · `[postId]/page.tsx` · `[postId]/edit/page.tsx` |
| Guard | `requireUser()` ở layout `(tenant)`, lặp lại trong `features/posts/queries.ts` |
| Render | Server Component + `<Suspense>` |

## Việc của trang

Người thuê viết bài, lưu nháp, gửi cho chủ trọ duyệt, và theo dõi kết quả. Bài bị từ chối hiện
nguyên câu góp ý của chủ trọ — không có câu đó thì người ta gửi lại y hệt lần nữa.

## Dữ liệu

| Nguồn | Hàm |
|---|---|
| `features/posts/queries` | `listMyPosts()` · `getMyPost(id)` |

## Ghi

| Action | Việc |
|---|---|
| `createMyPost` · `updateMyPost` | soạn bài; slug dựng từ tiêu đề bằng `lib/slug` |
| `submitMyPost` | nháp/bị từ chối → chờ duyệt, **xoá sạch ba cột `review_*`** |
| `withdrawMyPost` | chờ duyệt → nháp |
| `deleteMyPost` | qua `ConfirmForm`; lỗi quay về bằng `?error=` |
| `uploadPostImages` · `setPostCover` · `deletePostImage` | ảnh |

`submitMyPost` phải xoá `review_note` / `reviewed_at` / `reviewed_by` vì `WITH CHECK` của
`posts_update_own` đòi cả ba là null. Bỏ bước đó thì RLS từ chối và người dùng nhận một lỗi không
giải thích được.

## Giới hạn người thuê thấy được

Bài đã đăng thì tác giả **không** sửa, không xoá — chỉ chủ trọ. Trang hiện thẳng câu đó thay vì
disable nút một cách im lặng. Đường dẫn của bài đã đăng có thể đã được chia sẻ ra ngoài.

Chi tiết luồng và hạn mức: [13-bai-viet.md](../../../../13-bai-viet.md).
