-- =============================================================================
--  0001_schema.sql — bảng lõi
--
--  Chạy: dán vào Supabase Dashboard > SQL Editor, hoặc `supabase db push`.
--  Thứ tự: 0001_schema.sql -> 0002_rls.sql -> (tuỳ chọn) seed.sql
--
--  KHÔNG có bảng `settings`. Tên nhà trọ / liên hệ / nội quy nằm ở
--  src/config/site.ts — một nguồn sự thật duy nhất.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enum types

do $$ begin
  create type public.user_role as enum ('admin', 'tenant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.room_status as enum ('vacant', 'occupied', 'maintenance', 'reserved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tenancy_status as enum ('active', 'ended', 'terminated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.room_event_type as enum
    ('checkin', 'checkout', 'maintenance', 'price_change', 'incident', 'note');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wifi_scope as enum ('global', 'floor', 'room');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------ profiles

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text        not null unique,
  full_name     text        not null,
  phone         text,
  role          public.user_role not null default 'tenant',
  date_of_birth date,
  hometown      text,
  note          text,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Hồ sơ người dùng, 1-1 với auth.users. Xoá auth user thì hồ sơ xoá theo.';

create index if not exists profiles_role_idx on public.profiles (role);

-- --------------------------------------------------------------------- rooms

create table if not exists public.rooms (
  id             uuid primary key default gen_random_uuid(),
  code           text        not null unique,
  floor          integer     not null default 1,
  area_m2        numeric(6, 2)  not null default 0,
  base_price     numeric(12, 0) not null default 0,
  electric_price numeric(12, 0) not null default 0,
  water_price    numeric(12, 0) not null default 0,
  service_price  numeric(12, 0) not null default 0,
  max_occupants  integer     not null default 2,
  status         public.room_status not null default 'vacant',
  description    text,
  created_at     timestamptz not null default now(),

  constraint rooms_floor_positive     check (floor >= 0),
  constraint rooms_occupants_positive check (max_occupants >= 1)
);

comment on column public.rooms.status is
  'Chỉ mang ý định thủ công của chủ trọ (maintenance/reserved). Đang ở hay còn '
  'trống được SUY RA từ tenancies đang hiệu lực, không lưu ở đây.';

create index if not exists rooms_floor_idx on public.rooms (floor);

-- ----------------------------------------------------------------- tenancies

create table if not exists public.tenancies (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms (id)    on delete cascade,
  tenant_id     uuid not null references public.profiles (id) on delete cascade,
  is_primary    boolean     not null default true,
  start_date    date        not null,
  end_date      date,
  deposit       numeric(12, 0) not null default 0,
  monthly_price numeric(12, 0) not null default 0,
  status        public.tenancy_status not null default 'active',
  end_reason    text,
  created_at    timestamptz not null default now(),

  constraint tenancies_end_after_start
    check (end_date is null or end_date >= start_date),

  -- Hợp đồng còn hiệu lực thì bắt buộc status = 'active', và ngược lại.
  constraint tenancies_status_matches_end_date check (
    (end_date is null and status = 'active') or
    (end_date is not null and status <> 'active')
  )
);

comment on column public.tenancies.monthly_price is
  'Ảnh chụp giá lúc ký. Tăng giá phòng về sau KHÔNG được sửa lại dòng cũ.';

-- Một người chỉ thuê một phòng tại một thời điểm — chặn ngay ở tầng DB.
create unique index if not exists tenancies_one_active_per_tenant
  on public.tenancies (tenant_id) where end_date is null;

create index if not exists tenancies_room_idx   on public.tenancies (room_id);
create index if not exists tenancies_tenant_idx on public.tenancies (tenant_id);
create index if not exists tenancies_active_idx on public.tenancies (room_id) where end_date is null;

-- --------------------------------------------------------------- room_events

create table if not exists public.room_events (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms (id) on delete cascade,
  type        public.room_event_type not null default 'note',
  title       text        not null,
  content     text,
  cost        numeric(12, 0),
  occurred_at timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null
);

comment on table public.room_events is
  'Nhật ký nội bộ của chủ trọ: sửa chữa, sự cố, đổi giá. Người thuê không đọc được.';

create index if not exists room_events_room_idx on public.room_events (room_id, occurred_at desc);

-- ------------------------------------------------------------- wifi_networks

create table if not exists public.wifi_networks (
  id       uuid primary key default gen_random_uuid(),
  ssid     text not null,
  password text not null,
  scope    public.wifi_scope not null default 'global',
  room_id  uuid references public.rooms (id) on delete cascade,
  floor    integer,
  note     text,

  -- Phạm vi nào thì phải có đúng cột định danh của phạm vi đó.
  constraint wifi_scope_target check (
    (scope = 'global' and room_id is null and floor is null) or
    (scope = 'floor'  and room_id is null and floor is not null) or
    (scope = 'room'   and room_id is not null and floor is null)
  )
);

-- ------------------------------------------- tự tạo profile khi có auth user

-- ⚠️  KHÔNG BAO GIỜ đọc `role` từ raw_user_meta_data.
--
-- user_metadata do CHÍNH NGƯỜI DÙNG gửi lên khi đăng ký. Nếu trigger tin vào đó,
-- bất kỳ ai POST tới /auth/v1/signup kèm {"role":"admin"} sẽ tự thành chủ trọ.
-- Mọi tài khoản mới đều là 'tenant'. Nâng quyền admin phải làm thủ công bằng SQL.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'tenant',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
