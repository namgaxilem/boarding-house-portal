-- =============================================================================
--  0015_posts_revoke_anon_table_grants.sql — làm cho GRANT theo cột ở 0013 có
--  tác dụng thật
--
--  0013 viết:
--
--      grant select (id, slug, title, …) on public.posts to anon;
--
--  và tin rằng như vậy là `anon` chỉ đọc được 11 cột đó. SAI.
--
--  Supabase cấu hình `alter default privileges in schema public grant all on
--  tables to anon, authenticated, service_role`, nên MỌI bảng mới trong schema
--  `public` sinh ra đã có `anon=arwdDxtm` — tức là `anon` đã có SELECT cấp BẢNG,
--  và quyền cấp bảng phủ mọi cột. GRANT theo cột chỉ thu hẹp khi KHÔNG có quyền
--  cấp bảng; thêm nó lên trên một quyền rộng hơn là một lệnh không làm gì cả.
--
--  Hệ quả trước bản vá này: khách vãng lai đọc được `review_note`, `author_id`,
--  `reviewed_by`, `created_at` của mọi bài công khai. RLS vẫn lọc đúng DÒNG
--  (chỉ bài published + public), nên đây không phải lộ bài nháp hay hàng chờ —
--  nhưng `review_note` là câu chủ trọ viết riêng cho tác giả, và nó không có
--  việc gì ở ngoài internet.
--
--  ⚠️ Phạm vi bản vá: CHỈ hai bảng của tính năng bài viết. Mọi bảng khác trong
--  project vẫn mang đúng bộ quyền mặc định đó — đó là mô hình chuẩn của Supabase
--  và của repo này (xem docs/03: "RLS là ranh giới thật"), và sửa nó cho 20 bảng
--  là một việc riêng, phải rà từng policy một. Ở đây chỉ sửa chỗ mà thiết kế đã
--  HỨA một điều nó không làm được.
--
--  Chạy sau 0014_posts_function_grants.sql.
-- =============================================================================

-- --------------------------------------------------------------- posts

--  Gỡ sạch rồi cấp lại đúng những gì cần. `revoke all` bao gồm cả TRUNCATE,
--  REFERENCES và TRIGGER — ba quyền không ai trong hai vai này có lý do dùng, và
--  TRUNCATE thì đi vòng qua RLS hoàn toàn.
revoke all on public.posts from anon;

--  Đúng 11 cột. Bốn cột vắng mặt là chủ ý:
--    review_note  — chủ trọ viết riêng cho tác giả
--    reviewed_by  — ai duyệt là việc nội bộ
--    author_id    — `author_name` đã đủ để hiển thị; id thì không
--    created_at   — mốc công khai là `published_at`, không phải lúc gõ bài
grant select (
  id, slug, title, excerpt, body, cover_path,
  author_name, published_at, updated_at, status, visibility
) on public.posts to anon;

--  `authenticated` giữ đúng bốn quyền 0013 cấp, bỏ phần thừa từ default
--  privileges. RLS vẫn là thứ quyết định dòng nào.
revoke all on public.posts from authenticated;
grant select, insert, update, delete on public.posts to authenticated;

-- --------------------------------------------------------- post_images

revoke all on public.post_images from anon;
grant select (id, post_id, storage_path, alt, sort_order) on public.post_images to anon;

--  `bytes` và `uploaded_by` không cấp cho anon: một cái là chi tiết kế toán dung
--  lượng, cái kia là id người tải lên.
revoke all on public.post_images from authenticated;
grant select, insert, delete on public.post_images to authenticated;
