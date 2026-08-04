-- =============================================================================
--  0003_grants.sql — quyền ở tầng bảng + API công khai
--
--  RLS lọc DÒNG, nhưng Postgres vẫn cần GRANT ở tầng BẢNG trước đã. Thiếu GRANT
--  thì truy vấn báo thẳng "permission denied for table rooms", chứ không phải
--  trả về 0 dòng. Hai thứ này độc lập, phải làm cả hai.
--
--  Chạy sau 0002_rls.sql.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- ------------------------------------------------- người dùng đã đăng nhập

-- Cấp rộng ở tầng bảng, rồi để RLS quyết định đọc/ghi được dòng nào.
grant select, insert, update, delete on
  public.profiles,
  public.rooms,
  public.tenancies,
  public.room_events,
  public.wifi_networks
to authenticated;

-- service_role bỏ qua RLS (dùng cho tạo/xoá tài khoản), vẫn cần GRANT.
grant all on
  public.profiles,
  public.rooms,
  public.tenancies,
  public.room_events,
  public.wifi_networks
to service_role;

-- --------------------------------------------------------- khách vãng lai

-- `anon` KHÔNG được cấp quyền trên bất kỳ bảng nào.
--
-- Trang giới thiệu cần biết phòng nào còn trống. Nếu cấp cho anon quyền đọc
-- `tenancies`, RLS sẽ trả về 0 dòng — và khi đó MỌI phòng trông như còn trống,
-- kể cả phòng đang có người ở. Sai nghiêm trọng.
--
-- Nên tính sẵn trong hàm SECURITY DEFINER, chỉ trả ra đúng thứ cần công khai.
create or replace function public.vacant_rooms()
returns setof public.rooms
language sql
stable
security definer
set search_path = public
as $$
  select r.*
  from public.rooms r
  where r.status not in ('maintenance', 'reserved')
    and not exists (
      select 1 from public.tenancies t
      where t.room_id = r.id and t.end_date is null
    )
  order by r.code;
$$;

comment on function public.vacant_rooms() is
  'Danh sách phòng còn trống cho trang công khai. Suy ra từ tenancies, '
  'không đọc cột status của phòng đang ở.';

revoke all on function public.vacant_rooms() from public;
grant execute on function public.vacant_rooms() to anon, authenticated;
