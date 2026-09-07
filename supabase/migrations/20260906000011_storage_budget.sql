-- ============================================================================
--  Siết dung lượng Storage cho gói miễn phí
-- ============================================================================
--
--  Dự án chạy trên gói miễn phí của Supabase: 1GB Storage, 5GB băng thông mỗi
--  tháng. Migration này làm hai việc:
--
--    1. Hạ `file_size_limit` của cả bốn bucket xuống sát mức trình duyệt thật
--       sự tạo ra, thay vì mức 5MB rộng rãi ban đầu.
--    2. Thêm `public.storage_usage()` để chủ trọ NHÌN THẤY mình đang dùng bao
--       nhiêu, thay vì phát hiện ra lúc bucket đầy.
--
--  Chạy lại được nhiều lần: bucket dùng `on conflict do update`, function dùng
--  `create or replace`.

-- ------------------------------------------------------- 1. hạn mức bucket

--  Vì sao 1.5MB chứ không phải 5MB?
--
--  Trình duyệt nén ảnh xuống ~300–500KB trước khi gửi (xem `lib/image.ts`, và
--  từ bản này thì có cả bậc thang hạ chất lượng để BẢO ĐẢM chạm mức đó, chứ
--  không chỉ nhắm chừng). 5MB rộng gấp mười lần mức thật — nghĩa là ai gọi
--  thẳng vào Storage API bằng phiên đăng nhập của mình vẫn đẩy được file gấp
--  mười lần bình thường, và chốt chặn cuối cùng coi như không có.
--
--  1.5MB vẫn rộng gấp ba mức thật, đủ chỗ cho một tấm ảnh nhiều chi tiết mà
--  bậc thang nén không kéo nổi xuống, nhưng không còn là cánh cửa mở toang.
--
--  LƯU Ý khi vận hành: hạ `file_size_limit` KHÔNG đụng tới file đã nằm sẵn
--  trong bucket — nó chỉ áp cho lần ghi mới. Không có nguy cơ mất dữ liệu cũ.

--  Ảnh phòng: hiện trên trang giới thiệu công khai.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos', 'room-photos', true, 1572864,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

--  Ảnh CCCD: riêng tư, chỉ mở bằng URL có chữ ký còn hạn.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('id-photos', 'id-photos', false, 1572864,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

--  Ảnh QR chuyển khoản: 1MB. Từ bản này ảnh QR LUÔN được nén (trước đây ảnh
--  dưới 1MB được giữ nguyên bản), nên mức thật rơi vào 30–150KB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-qr', 'payment-qr', true, 1048576,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

--  Ảnh báo hỏng: riêng tư.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maintenance-photos', 'maintenance-photos', false, 1572864,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------------- 2. xem dung lượng đã dùng

--  `storage.objects` không cho `authenticated` đọc trực tiếp, và cũng không nên
--  cho: một lệnh select trần trên bảng đó là danh sách toàn bộ đường dẫn file
--  riêng tư của mọi người thuê.
--
--  SECURITY DEFINER cho phép hàm này đọc bảng đó thay mặt người gọi, nhưng chỉ
--  trả về SỐ ĐẾM và TỔNG BYTE theo từng bucket — không có tên file, không có id
--  người dùng. `is_admin()` chặn ở đầu hàm: người thuê gọi được cũng không thấy
--  gì ngoài lỗi.
--
--  `metadata->>'size'` là nơi Storage ghi kích thước thật của từng object.
create or replace function public.storage_usage()
returns table (
  bucket       text,
  object_count bigint,
  total_bytes  bigint
)
language plpgsql
security definer
-- search_path cố định: SECURITY DEFINER chạy bằng quyền của người tạo hàm, nên
-- để người gọi tự đặt search_path là mở đường cho họ trỏ `storage` sang schema
-- của chính họ.
set search_path = storage, public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    o.bucket_id::text                                         as bucket,
    count(*)::bigint                                          as object_count,
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint as total_bytes
  from storage.objects o
  where o.bucket_id in
    ('room-photos', 'id-photos', 'payment-qr', 'maintenance-photos')
  group by o.bucket_id
  order by o.bucket_id;
end;
$$;

revoke all on function public.storage_usage() from public;
grant execute on function public.storage_usage() to authenticated;
