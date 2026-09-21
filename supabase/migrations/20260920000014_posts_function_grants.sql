-- =============================================================================
--  0014_posts_function_grants.sql — siết quyền EXECUTE cho hàm của 0013
--
--  Postgres cấp EXECUTE cho PUBLIC trên MỌI hàm mới theo mặc định, và Supabase
--  còn cấu hình default privileges cấp thêm cho `anon` / `authenticated` /
--  `service_role`. Nên `grant execute ... to authenticated` KHÔNG thu hẹp gì cả:
--  nó chỉ thêm một dòng vào danh sách vốn đã mở.
--
--  Bốn RPC chuyển trạng thái ở 0013 không dính vì chúng có `revoke all ... from
--  public, anon` đứng trước. Sáu hàm còn lại thì có, và database linter bắt
--  đúng (lint 0028/0029): chúng hiện ra ngoài qua `/rest/v1/rpc/<tên>`.
--
--  Mức nguy hiểm thật thấp — hai hàm `*_enforce_quota` trả `trigger` nên
--  PostgREST không gọi được, `posts_guard_update` cũng vậy, và ba hàm `can_*` /
--  `post_is_*` chỉ trả boolean. Nhưng một bề mặt API không ai định mở thì đóng
--  lại, và đóng bây giờ thì lần sau linter kêu là kêu về thứ có thật.
--
--  Chạy sau 0013_posts.sql.
-- =============================================================================

-- ------------------------------------------- hàm trigger: không ai gọi được

--  Trả `trigger`, chỉ Postgres gọi khi trigger bắn. Không có lý do nào để chúng
--  xuất hiện trong danh sách RPC của PostgREST.
revoke all on function public.posts_guard_update()        from public, anon, authenticated;
revoke all on function public.posts_enforce_quota()       from public, anon, authenticated;
revoke all on function public.post_images_enforce_quota() from public, anon, authenticated;

--  `posts_guard_update` là hàm duy nhất của 0013 quên `set search_path`. Nó
--  KHÔNG phải SECURITY DEFINER nên rủi ro nhỏ, nhưng để search_path cho người
--  gọi tự đặt là thói quen sai — và đây là trigger chạy trên mọi lần sửa bài.
alter function public.posts_guard_update() set search_path = public, pg_temp;

-- --------------------------------------------------- hàm quyền: đúng vai nào

--  Dùng trong policy của `post_images` cho vai `anon`, và policy được đánh giá
--  bằng quyền của chính người gọi — nên `anon` PHẢI giữ EXECUTE. Chỉ gỡ PUBLIC.
revoke all on function public.post_is_public(uuid) from public;
grant execute on function public.post_is_public(uuid) to anon, authenticated, service_role;

--  Hai hàm này chỉ xuất hiện trong policy của vai `authenticated` (bảng
--  `post_images` và `storage.objects`). Khách vãng lai không có việc gì với
--  chúng: `can_edit_post` trả lời "bài này còn sửa được không", tức là để lộ một
--  bài tồn tại hay không cho người chưa đăng nhập.
revoke all on function public.can_edit_post(uuid)    from public, anon;
grant execute on function public.can_edit_post(uuid) to authenticated, service_role;

revoke all on function public.post_is_readable(uuid)    from public, anon;
grant execute on function public.post_is_readable(uuid) to authenticated, service_role;

-- ------------------------------------------------------------ storage_usage

--  0013 khai lại hàm này để thêm bucket `post-images`. `create or replace` giữ
--  nguyên ACL cũ, mà ACL cũ có `anon` (default privileges của Supabase cấp từ
--  lúc 0011 tạo hàm, `revoke ... from public` ở đó không chạm tới). Hàm tự chặn
--  bằng `is_admin()` nên đây là dọn bề mặt, không phải vá lỗ.
revoke all on function public.storage_usage() from public, anon;
grant execute on function public.storage_usage() to authenticated, service_role;
