[← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/posts` — Duyệt và quản lý bài viết

| | |
|---|---|
| File | `page.tsx` · `new/page.tsx` · `[postId]/page.tsx` · `[postId]/edit/page.tsx` |
| Guard | `requireAdmin()` ở layout `(admin)`, lặp lại trong `features/posts/queries.ts` |
| Huy hiệu | `AdminTodo.pendingPosts` — mục thứ ba có số đỏ trên thanh bên |

## Việc của trang

Hàng chờ duyệt, và nơi chủ trọ tự viết bài. Bộ lọc mặc định là **Chờ duyệt** — đó là việc NGƯỜI
KHÁC tạo ra cho chủ trọ, cùng lý do mục này được gắn huy hiệu.

## Hai quyết định, không phải một

Duyệt bài có **hai nút** chứ không một nút cộng một dropdown:

- **Duyệt — chỉ nội bộ**: hiện với người đã đăng nhập.
- **Duyệt — công khai**: đẩy lên Google và hiện với khách vãng lai.

Một dropdown mặc định sẵn sẽ được bấm qua mà không ai đọc, và "đẩy lên internet" không phải thứ nên
xảy ra vì quán tính. Từ chối thì bắt mở ô lý do trước.

## Gỡ ≠ xoá

| Thao tác | Kết quả |
|---|---|
| **Gỡ khỏi trang** (`archive_post`) | bài biến khỏi `/blog`, **slug ở lại** |
| **Xoá hẳn** (`ConfirmForm`) | bài, ảnh, và đường dẫn biến mất |

Giữ slug lại là để một bài mới trùng tiêu đề không chiếm được đúng URL mà Google vẫn đang giữ trong
chỉ mục. Hộp thoại xoá nói thẳng câu đó.

## Ghi

`approvePost` · `rejectPost` · `publishPost` · `archivePost` gọi RPC `SECURITY DEFINER` có
`for update` — hai tab admin cùng bấm Duyệt thì tab thứ hai đọc lại trạng thái mới thay vì ghi đè.

`updatePostAsAdmin` là chỗ duy nhất đổi được `visibility` của một bài đã đăng.

Chi tiết: [13-bai-viet.md](../../../../13-bai-viet.md).
