-- =============================================================================
--  0009_maintenance_photos.sql — ảnh đính kèm phiếu báo hỏng
--
--  "Vòi nước bếp bị rò" không nói được là rò ở cổ vòi hay ở ống dưới bồn. Chủ trọ
--  vẫn phải đi xem một chuyến trước khi gọi thợ mang đồ. Một tấm ảnh bỏ được
--  chuyến đó.
--
--  Bucket RIÊNG TƯ, khác `room-photos` và khác `payment-qr`. Ảnh chụp trong phòng
--  người ta ở: cái bồn rửa, góc bếp, đôi khi cả đồ đạc cá nhân trong khung hình.
--  Không có lý do gì để một URL đoán được mở ra được nó.
--
--  Chạy sau 0008_payments_maintenance_settlement.sql.
-- =============================================================================

-- ------------------------------------------------------- hai hàm quyền dùng chung

-- Một định nghĩa "ai xem được phiếu này", dùng cho CẢ bảng ảnh LẪN storage.
--
-- Viết lại điều kiện ở hai nơi là cách chắc chắn để sáu tháng sau chúng lệch
-- nhau, và cái lệch đó luôn nghiêng về phía mở rộng hơn cần thiết.
create or replace function public.can_view_maintenance(request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.maintenance_requests r
    where r.id = request_id
      and (
        public.is_admin()
        or r.reported_by = auth.uid()
        or r.room_id in (select public.my_room_ids())
      )
  );
$$;

-- Ai được ĐÍNH thêm ảnh. Hẹp hơn hẳn quyền xem:
--   - phải là chủ trọ, hoặc chính người gửi phiếu (người ở cùng phòng thì không);
--   - phiếu chưa đóng — đóng rồi thì đó là hồ sơ, không phải việc đang làm.
create or replace function public.can_attach_maintenance(request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.maintenance_requests r
    where r.id = request_id
      and r.status <> 'closed'
      and (public.is_admin() or r.reported_by = auth.uid())
  );
$$;

revoke all on function public.can_view_maintenance(uuid)   from public;
revoke all on function public.can_attach_maintenance(uuid) from public;
grant execute on function public.can_view_maintenance(uuid)   to authenticated;
grant execute on function public.can_attach_maintenance(uuid) to authenticated;

-- ------------------------------------------------------------------- bảng

create table if not exists public.maintenance_photos (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.maintenance_requests (id) on delete cascade,
  -- Đường dẫn trong bucket, LUÔN dạng "<request_id>/<uuid>.<ext>". Policy trên
  -- storage.objects đọc thư mục đầu tiên để biết ảnh thuộc phiếu nào, nên quy
  -- ước này là một phần của mô hình quyền, không phải chuyện thẩm mỹ.
  storage_path text not null unique,
  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

comment on table public.maintenance_photos is
  'Ảnh đính kèm phiếu báo hỏng. Bucket riêng tư — ảnh chụp trong phòng người ở.';

create index if not exists maintenance_photos_request_idx
  on public.maintenance_photos (request_id, created_at);

alter table public.maintenance_photos enable row level security;

drop policy if exists maintenance_photos_select on public.maintenance_photos;
create policy maintenance_photos_select on public.maintenance_photos
  for select to authenticated
  using (public.can_view_maintenance(request_id));

drop policy if exists maintenance_photos_insert on public.maintenance_photos;
create policy maintenance_photos_insert on public.maintenance_photos
  for insert to authenticated
  with check (
    public.can_attach_maintenance(request_id)
    -- Đứng tên chính mình. Thiếu vế này thì một người đính ảnh rồi ghi tên người
    -- khác vào `uploaded_by`.
    and uploaded_by = auth.uid()
  );

-- Xoá: chủ trọ xoá ảnh nào cũng được; người thuê chỉ xoá ảnh CHÍNH MÌNH vừa
-- tải lên, và chỉ khi phiếu còn mở. Không có policy UPDATE — ảnh không sửa được,
-- chỉ thêm hoặc xoá.
drop policy if exists maintenance_photos_delete on public.maintenance_photos;
create policy maintenance_photos_delete on public.maintenance_photos
  for delete to authenticated
  using (
    public.is_admin()
    or (uploaded_by = auth.uid() and public.can_attach_maintenance(request_id))
  );

grant select, insert, delete on public.maintenance_photos to authenticated;
grant all on public.maintenance_photos to service_role;

-- ------------------------------------------------------------------ bucket

-- 5MB: trình duyệt đã thu ảnh về ~1600px / 300–500KB trước khi gửi (xem
-- lib/image.ts). Con số này là chốt chặn cuối cho trường hợp ai đó gọi thẳng API
-- storage, không phải mức bình thường.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'maintenance-photos',
  'maintenance-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------- quyền trên storage.objects

-- `storage.foldername(name)` tách đường dẫn thành mảng; phần tử đầu là id phiếu.
-- Ép sang uuid ngay tại đây: một tên file không đúng quy ước sẽ lỗi ép kiểu và
-- bị từ chối, thay vì lọt qua vì so chuỗi hụt.
drop policy if exists "maintenance_photos_object_read" on storage.objects;
create policy "maintenance_photos_object_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'maintenance-photos'
    and public.can_view_maintenance(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "maintenance_photos_object_insert" on storage.objects;
create policy "maintenance_photos_object_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'maintenance-photos'
    and public.can_attach_maintenance(((storage.foldername(name))[1])::uuid)
  );

-- Xoá file: chủ trọ, hoặc người còn quyền đính ảnh vào phiếu đó. Cố ý không cho
-- `anon` bất kỳ quyền nào — bucket này không có phần công khai.
drop policy if exists "maintenance_photos_object_delete" on storage.objects;
create policy "maintenance_photos_object_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'maintenance-photos'
    and (
      public.is_admin()
      or public.can_attach_maintenance(((storage.foldername(name))[1])::uuid)
    )
  );
