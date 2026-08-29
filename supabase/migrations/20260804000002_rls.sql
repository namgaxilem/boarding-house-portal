-- =============================================================================
--  0002_rls.sql — Row Level Security
--
--  Đây là RÀO BẢO MẬT THẬT. Middleware/proxy và guard trong layout chỉ lo trải
--  nghiệm; nếu code frontend có bug thì RLS vẫn chặn người thuê đọc dữ liệu của
--  người khác.
--
--  Chạy sau 0001_schema.sql.
-- =============================================================================

-- --------------------------------------------------------- hàm hỗ trợ

-- SECURITY DEFINER để tránh đệ quy: policy trên `profiles` gọi hàm này, mà hàm
-- lại đọc `profiles`. Chạy dưới quyền owner nên bỏ qua RLS của chính nó.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- Các phòng mà người đang đăng nhập đang thuê (hợp đồng còn hiệu lực).
create or replace function public.my_room_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select room_id from public.tenancies
  where tenant_id = auth.uid() and end_date is null;
$$;

-- Người ở cùng phòng.
--
-- Không làm bằng RLS policy trên `profiles`: RLS chặn theo DÒNG, không chặn theo
-- CỘT. Mở dòng ra là lộ luôn `note` (ghi chú riêng của chủ trọ) và số điện thoại.
-- Hàm này trả về đúng 3 cột cần hiển thị, không hơn.
create or replace function public.my_roommates()
returns table (id uuid, full_name text, start_date date)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, t.start_date
  from public.tenancies t
  join public.profiles p on p.id = t.tenant_id
  where t.end_date is null
    and t.room_id in (select public.my_room_ids())
    and t.tenant_id <> auth.uid()
  order by t.start_date;
$$;

revoke all on function public.is_admin()     from public;
revoke all on function public.my_room_ids()  from public;
revoke all on function public.my_roommates() from public;
grant execute on function public.is_admin()    to authenticated;
grant execute on function public.my_room_ids() to authenticated;
grant execute on function public.my_roommates() to authenticated;

-- --------------------------------------------------------------- bật RLS

alter table public.profiles      enable row level security;
alter table public.rooms         enable row level security;
alter table public.tenancies     enable row level security;
alter table public.room_events   enable row level security;
alter table public.wifi_networks enable row level security;

-- ------------------------------------------------------------- profiles

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Người thuê sửa được hồ sơ của mình, nhưng KHÔNG được tự nâng quyền.
-- `role`/`is_active` bị khoá bằng WITH CHECK so với giá trị hiện có.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
  );

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- rooms

-- Mọi người ĐÃ ĐĂNG NHẬP đều đọc được thông tin phòng (mã, diện tích, giá) —
-- không phải bí mật, và người thuê cần thấy phòng của mình.
--
-- Khách vãng lai (anon) KHÔNG có quyền gì trên bảng này. Trang giới thiệu công
-- khai lấy dữ liệu qua hàm `public.vacant_rooms()` — xem migration 0003.
drop policy if exists rooms_select_all on public.rooms;
create policy rooms_select_all on public.rooms
  for select to authenticated
  using (true);

drop policy if exists rooms_admin_write on public.rooms;
create policy rooms_admin_write on public.rooms
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------ tenancies

drop policy if exists tenancies_select_own on public.tenancies;
create policy tenancies_select_own on public.tenancies
  for select to authenticated
  using (tenant_id = auth.uid() or public.is_admin());

drop policy if exists tenancies_admin_write on public.tenancies;
create policy tenancies_admin_write on public.tenancies
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------- room_events

-- Nhật ký nội bộ: chi phí sửa chữa, ghi chú về khách. Người thuê không đọc.
drop policy if exists room_events_admin_only on public.room_events;
create policy room_events_admin_only on public.room_events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------------------------------------- wifi_networks

-- Người thuê chỉ thấy wifi áp dụng cho phòng/tầng của mình.
drop policy if exists wifi_select_scoped on public.wifi_networks;
create policy wifi_select_scoped on public.wifi_networks
  for select to authenticated
  using (
    public.is_admin()
    or scope = 'global'
    or (scope = 'room' and room_id in (select public.my_room_ids()))
    or (scope = 'floor' and floor in (
          select r.floor from public.rooms r
          where r.id in (select public.my_room_ids())
       ))
  );

drop policy if exists wifi_admin_write on public.wifi_networks;
create policy wifi_admin_write on public.wifi_networks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
