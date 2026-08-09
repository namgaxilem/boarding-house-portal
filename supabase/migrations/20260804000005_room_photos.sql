-- =============================================================================
--  0005_room_photos.sql — ảnh phòng
--
--  Ảnh phòng là dữ liệu quảng cáo: khách vãng lai phải xem được ở trang giới
--  thiệu. Nên bucket để public. Nhưng CHỈ admin được ghi.
--
--  Chạy sau 0004_identity.sql.
-- =============================================================================

create table if not exists public.room_photos (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms (id) on delete cascade,
  -- Đường dẫn trong bucket, ví dụ "room-<uuid>/1754280000000-abc123.webp".
  storage_path text not null unique,
  caption      text,
  -- Ảnh bìa = ảnh có sort_order nhỏ nhất. Cố ý không thêm cột `is_cover`:
  -- hai nguồn sự thật cho cùng một khái niệm là chỗ để chúng lệch nhau.
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists room_photos_room_idx
  on public.room_photos (room_id, sort_order);

alter table public.room_photos enable row level security;

-- Ai cũng xem được, kể cả chưa đăng nhập — trang giới thiệu cần.
drop policy if exists room_photos_public_read on public.room_photos;
create policy room_photos_public_read on public.room_photos
  for select to anon, authenticated
  using (true);

drop policy if exists room_photos_admin_write on public.room_photos;
create policy room_photos_admin_write on public.room_photos
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.room_photos to anon;
grant select, insert, update, delete on public.room_photos to authenticated;
grant all on public.room_photos to service_role;

-- ------------------------------------------------------------------- bucket

-- 5MB/ảnh là dư sau khi trình duyệt đã resize; đây chỉ là chốt chặn cuối để một
-- ảnh gốc 12MP không lọt lên.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-photos',
  'room-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------- quyền trên storage.objects

-- Bucket public cho phép đọc qua URL công khai, nhưng policy SELECT vẫn cần để
-- gọi được API storage (liệt kê, lấy metadata).
drop policy if exists "room_photos_object_read" on storage.objects;
create policy "room_photos_object_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'room-photos');

-- Ghi/xoá file: chỉ admin. Thiếu policy này thì bất kỳ ai đăng nhập cũng đẩy
-- file lên bucket công khai của bạn được.
drop policy if exists "room_photos_object_write" on storage.objects;
create policy "room_photos_object_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'room-photos' and public.is_admin())
  with check (bucket_id = 'room-photos' and public.is_admin());
