-- =============================================================================
--  0004_identity.sql — CCCD, ràng buộc duy nhất, liên kết Zalo
--
--  Mỗi người thuê có đúng MỘT email, MỘT CCCD, MỘT số điện thoại. Ràng buộc
--  duy nhất đặt ở tầng database, không chỉ ở form — form có thể bị bỏ qua bằng
--  cách POST thẳng vào Server Action.
--
--  Chạy sau 0003_grants.sql.
-- =============================================================================

alter table public.profiles
  add column if not exists id_number text,
  add column if not exists zalo_id   text;

comment on column public.profiles.id_number is
  'Số CCCD/CMND. DỮ LIỆU CÁ NHÂN NHẠY CẢM theo Nghị định 13/2023/NĐ-CP. '
  'RLS chỉ cho chính chủ và admin đọc. Không lộ qua my_roommates().';

comment on column public.profiles.zalo_id is
  'ID người dùng Zalo, điền tự động lần đầu đăng nhập bằng Zalo. '
  'Zalo không phải provider dựng sẵn của Supabase — xem src/lib/auth/zalo.ts.';

-- --------------------------------------------------------- ràng buộc dữ liệu

-- CCCD 12 số (mẫu mới) hoặc CMND 9 số (mẫu cũ).
alter table public.profiles
  drop constraint if exists profiles_id_number_format;
alter table public.profiles
  add constraint profiles_id_number_format
  check (id_number is null or id_number ~ '^([0-9]{9}|[0-9]{12})$');

-- Số điện thoại VN: 10 số, bắt đầu bằng 0.
alter table public.profiles
  drop constraint if exists profiles_phone_format;
alter table public.profiles
  add constraint profiles_phone_format
  check (phone is null or phone ~ '^0[0-9]{9}$');

-- --------------------------------------------------------- duy nhất, cho NULL

-- Dùng UNIQUE INDEX chứ không dùng UNIQUE CONSTRAINT: Postgres coi mọi NULL là
-- khác nhau, nên nhiều người chưa khai CCCD vẫn cùng tồn tại được.
create unique index if not exists profiles_id_number_key
  on public.profiles (id_number) where id_number is not null;

create unique index if not exists profiles_phone_key
  on public.profiles (phone) where phone is not null;

create unique index if not exists profiles_zalo_id_key
  on public.profiles (zalo_id) where zalo_id is not null;

-- --------------------------------------------- khoá cột nhạy cảm khỏi self-edit

-- Người thuê sửa được hồ sơ của mình, nhưng KHÔNG được tự sửa CCCD hay tự gán
-- zalo_id của người khác. Bổ sung vào policy đã có ở 0002.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role      = (select p.role      from public.profiles p where p.id = auth.uid())
    and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
    -- CCCD là giấy tờ tuỳ thân: chỉ chủ trọ nhập, người thuê không tự đổi.
    and id_number is not distinct from
        (select p.id_number from public.profiles p where p.id = auth.uid())
    and zalo_id   is not distinct from
        (select p.zalo_id   from public.profiles p where p.id = auth.uid())
  );

-- ------------------------------------------------- tra cứu cho đăng nhập Zalo

-- Zalo không trả email. Luồng đăng nhập cần tìm hồ sơ theo zalo_id hoặc theo số
-- điện thoại, mà lúc đó người dùng CHƯA đăng nhập nên không qua được RLS.
-- Hàm này chạy SECURITY DEFINER và chỉ trả về email — vừa đủ để dựng phiên,
-- không lộ thêm gì.
create or replace function public.find_login_email(p_zalo_id text, p_phone text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where p.is_active
    and (
      (p_zalo_id is not null and p.zalo_id = p_zalo_id)
      or (p_phone is not null and p.phone = p_phone)
    )
  order by (p.zalo_id = p_zalo_id) desc nulls last
  limit 1;
$$;

comment on function public.find_login_email(text, text) is
  'Dùng cho đăng nhập Zalo. Chỉ gọi từ server bằng service_role.';

-- KHÔNG cấp cho anon/authenticated: cấp là biến thành API dò xem số điện thoại
-- nào đang thuê trọ ở đây.
--
-- service_role thì PHẢI cấp tường minh. Nó bỏ qua RLS, nhưng GRANT trên hàm là
-- chuyện khác — thiếu dòng dưới thì luồng đăng nhập Zalo chết với lỗi
-- "permission denied for function find_login_email".
revoke all on function public.find_login_email(text, text) from public, anon, authenticated;
grant execute on function public.find_login_email(text, text) to service_role;
