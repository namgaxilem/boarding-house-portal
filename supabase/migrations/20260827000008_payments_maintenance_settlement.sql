-- =============================================================================
--  0008_payments_maintenance_settlement.sql
--
--  Ba việc, gom một migration vì cả ba đều đụng vào vòng đời "ở trọ → trả phòng":
--
--    1. `payment_accounts`     — số tài khoản và ẢNH QR chủ trọ tự thêm.
--    2. `maintenance_requests` — báo hỏng: người thuê gửi, chủ trọ xử lý.
--    3. Kết toán tiền cọc      — ba cột thêm vào `tenancies`.
--
--  Chạy sau 0007_meters_invoices_notifications.sql.
-- =============================================================================

-- ---------------------------------------------------------------- enum types

-- Hai loại thông báo mới. `add value` nằm ở đầu file và KHÔNG được dùng trong
-- chính migration này: Postgres cho thêm giá trị enum trong transaction, nhưng
-- chưa cho dùng giá trị đó cho tới khi transaction commit.
alter type public.notification_type add value if not exists 'maintenance_new';
alter type public.notification_type add value if not exists 'maintenance_update';

do $$ begin
  -- 'bank' = số tài khoản gõ tay. 'qr' = ảnh QR chụp/tải lên.
  --
  -- Cố ý KHÔNG sinh mã VietQR: chủ trọ đã có sẵn ảnh QR trong app ngân hàng,
  -- chụp màn hình rồi tải lên là xong — không phải khai mã BIN, không phụ thuộc
  -- chuẩn nào có thể đổi, và cùng một chỗ này dùng được cho cả MoMo/ZaloPay.
  create type public.payment_account_kind as enum ('bank', 'qr');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.maintenance_status as enum
    ('open', 'in_progress', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.maintenance_priority as enum ('low', 'normal', 'urgent');
exception when duplicate_object then null; end $$;

-- =============================================================================
--  1. payment_accounts — cách nhận tiền
-- =============================================================================

create table if not exists public.payment_accounts (
  id             uuid primary key default gen_random_uuid(),
  kind           public.payment_account_kind not null,

  /** Tên hiển thị: "Vietcombank chủ trọ", "QR MoMo", "Techcombank dự phòng". */
  label          text not null,

  -- Chỉ dùng khi kind = 'bank'.
  bank_name      text,
  account_number text,
  account_holder text,

  -- Chỉ dùng khi kind = 'qr'. Đường dẫn trong bucket `payment-qr`.
  qr_path        text unique,

  /** Hướng dẫn thêm, ví dụ "quét bằng app ngân hàng, tự điền số tiền". */
  note           text,

  /** Tắt tạm mà không xoá — đổi ngân hàng thì tắt cái cũ, giữ lại để đối chiếu. */
  is_active      boolean     not null default true,
  sort_order     integer     not null default 0,
  created_at     timestamptz not null default now(),

  -- Loại nào thì phải có đúng dữ liệu của loại đó. Không có ràng buộc này thì
  -- một dòng 'bank' rỗng vẫn lưu được và người thuê thấy một thẻ trống trơn.
  constraint payment_accounts_shape check (
    (kind = 'bank'
      and bank_name is not null
      and account_number is not null
      and account_holder is not null
      and qr_path is null)
    or
    (kind = 'qr'
      and qr_path is not null
      and bank_name is null
      and account_number is null
      and account_holder is null)
  )
);

comment on table public.payment_accounts is
  'Số tài khoản / ảnh QR chủ trọ tự thêm. Thay cho việc hardcode một tài khoản '
  'duy nhất trong src/config/site.ts.';

create index if not exists payment_accounts_active_idx
  on public.payment_accounts (sort_order) where is_active;

alter table public.payment_accounts enable row level security;

-- Người thuê đọc được các cách nhận tiền ĐANG BẬT. Đây không phải bí mật: nó in
-- trên mọi hoá đơn. Nhưng dòng đã tắt thì ẩn, để không ai chuyển nhầm vào tài
-- khoản chủ trọ đã đóng.
drop policy if exists payment_accounts_select on public.payment_accounts;
create policy payment_accounts_select on public.payment_accounts
  for select to authenticated
  using (is_active or public.is_admin());

drop policy if exists payment_accounts_admin_write on public.payment_accounts;
create policy payment_accounts_admin_write on public.payment_accounts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.payment_accounts to authenticated;
grant all on public.payment_accounts to service_role;

-- --------------------------------------------------------- bucket payment-qr

-- Public như `room-photos`, KHÔNG private như `id-photos`.
--
-- Ảnh QR là thứ chủ trọ muốn càng nhiều người quét càng tốt; nó mã hoá đúng số
-- tài khoản vốn đã in trên hoá đơn. Để private thì mỗi lần hiện phải ký URL, mà
-- `next/image` chỉ được cấu hình cho đường dẫn public (xem next.config.ts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-qr',
  'payment-qr',
  true,
  2097152, -- 2MB: ảnh QR chụp màn hình điện thoại luôn nhỏ hơn nhiều
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_qr_object_read" on storage.objects;
create policy "payment_qr_object_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'payment-qr');

drop policy if exists "payment_qr_object_write" on storage.objects;
create policy "payment_qr_object_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'payment-qr' and public.is_admin())
  with check (bucket_id = 'payment-qr' and public.is_admin());

-- =============================================================================
--  2. maintenance_requests — báo hỏng
-- =============================================================================

create table if not exists public.maintenance_requests (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.rooms (id) on delete cascade,

  /** Ai báo. Có thể là chủ trọ tự ghi hộ khi người thuê gọi điện. */
  reported_by     uuid references public.profiles (id) on delete set null,

  title           text not null,
  description     text,
  priority        public.maintenance_priority not null default 'normal',
  status          public.maintenance_status   not null default 'open',

  /**
   * Chủ trọ ghi lại đã làm gì; hoặc người thuê ghi vì sao tự đóng.
   * Người thuê ĐỌC ĐƯỢC cột này — đó là mục đích của nó.
   */
  resolution_note text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  closed_at       timestamptz,
  closed_by       uuid references public.profiles (id) on delete set null
);

comment on table public.maintenance_requests is
  'Báo hỏng. Khác room_events ở chỗ đây là việc CHƯA XONG và có trạng thái theo '
  'dõi được; room_events là nhật ký của việc đã xảy ra.';

-- KHÔNG có cột `cost` ở đây, cố ý.
--
-- RLS lọc DÒNG chứ không lọc CỘT, và người thuê phải đọc được dòng phiếu của
-- mình để theo dõi trạng thái. Thêm `cost` vào đây là người thuê đọc được luôn
-- giá thợ báo cho chủ trọ, chỉ bằng một lệnh gọi API — không cần giao diện nào.
--
-- Chi phí sửa đi vào `room_events` (type = 'maintenance'), bảng vốn đã chỉ mở
-- cho admin và vốn đã có cột `cost`. Xử lý xong phiếu thì ghi một dòng ở đó.

create index if not exists maintenance_room_idx
  on public.maintenance_requests (room_id, created_at desc);

create index if not exists maintenance_reporter_idx
  on public.maintenance_requests (reported_by, created_at desc);

-- Hàng chờ của chủ trọ: chỉ hai trạng thái này mới cần nhìn tới.
create index if not exists maintenance_open_idx
  on public.maintenance_requests (created_at desc)
  where status in ('open', 'in_progress');

alter table public.maintenance_requests enable row level security;

-- Đọc: chủ trọ thấy tất cả; người thuê thấy phiếu của PHÒNG MÌNH ĐANG Ở, cộng
-- với phiếu chính mình từng gửi (kể cả sau khi đã chuyển phòng hoặc trả phòng).
--
-- Cho người ở cùng phòng thấy nhau là cố ý: hai người cùng báo một cái vòi hỏng
-- thì chủ trọ nhận hai phiếu trùng, còn thấy được nhau thì người thứ hai biết
-- việc đã có người báo rồi.
drop policy if exists maintenance_select on public.maintenance_requests;
create policy maintenance_select on public.maintenance_requests
  for select to authenticated
  using (
    public.is_admin()
    or reported_by = auth.uid()
    or room_id in (select public.my_room_ids())
  );

-- Gửi phiếu: người thuê chỉ gửi được cho phòng mình đang ở, và chỉ đứng tên
-- chính mình. `reported_by = auth.uid()` chặn việc gửi phiếu mạo danh người khác.
drop policy if exists maintenance_insert on public.maintenance_requests;
create policy maintenance_insert on public.maintenance_requests
  for insert to authenticated
  with check (
    public.is_admin()
    or (reported_by = auth.uid() and room_id in (select public.my_room_ids()))
  );

-- Sửa và xoá: CHỈ chủ trọ, và chỉ qua đường này.
--
-- Người thuê không có policy UPDATE nào. Hai việc họ được làm — sửa phiếu của
-- mình khi còn 'open', và tự đóng phiếu khi hết hỏng — đi qua hai hàm
-- SECURITY DEFINER bên dưới. Lý do: RLS lọc DÒNG chứ không lọc CỘT, nên một
-- policy UPDATE cho người thuê sẽ đồng thời cho họ tự đặt status = 'resolved'
-- và ghi `cost` — hai thứ chỉ chủ trọ được quyết.
drop policy if exists maintenance_admin_write on public.maintenance_requests;
create policy maintenance_admin_write on public.maintenance_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.maintenance_requests to authenticated;
grant all on public.maintenance_requests to service_role;

-- ------------------------------------------------- hai cửa hẹp cho người thuê

-- Đóng phiếu. Chủ trọ đóng phiếu nào cũng được; người thuê chỉ đóng phiếu do
-- chính mình gửi.
create or replace function public.close_maintenance_request(
  request_id uuid,
  note       text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.maintenance_requests;
begin
  select * into target from public.maintenance_requests where id = request_id;
  if not found then
    raise exception 'MAINTENANCE_NOT_FOUND';
  end if;

  if not (public.is_admin() or target.reported_by = auth.uid()) then
    raise exception 'MAINTENANCE_FORBIDDEN';
  end if;

  if target.status = 'closed' then
    raise exception 'MAINTENANCE_ALREADY_CLOSED';
  end if;

  update public.maintenance_requests
  set status          = 'closed',
      closed_at       = now(),
      closed_by       = auth.uid(),
      updated_at      = now(),
      -- Ghi chú cũ được giữ nếu lần đóng này không kèm ghi chú mới.
      resolution_note = coalesce(nullif(btrim(note), ''), resolution_note)
  where id = request_id;
end;
$$;

-- Sửa phiếu của chính mình, và CHỈ khi chủ trọ chưa động tới ('open').
--
-- Ba cột, không hơn. Không có `status`, không có `cost` — đó là lý do hàm này
-- tồn tại thay vì một policy UPDATE.
create or replace function public.update_my_maintenance_request(
  request_id      uuid,
  new_title       text,
  new_description text,
  new_priority    public.maintenance_priority
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.maintenance_requests;
begin
  select * into target from public.maintenance_requests where id = request_id;
  if not found then
    raise exception 'MAINTENANCE_NOT_FOUND';
  end if;

  if target.reported_by is distinct from auth.uid() then
    raise exception 'MAINTENANCE_FORBIDDEN';
  end if;

  if target.status <> 'open' then
    raise exception 'MAINTENANCE_LOCKED';
  end if;

  update public.maintenance_requests
  set title       = new_title,
      description = nullif(btrim(coalesce(new_description, '')), ''),
      priority    = new_priority,
      updated_at  = now()
  where id = request_id;
end;
$$;

revoke all on function public.close_maintenance_request(uuid, text) from public;
revoke all on function public.update_my_maintenance_request(
  uuid, text, text, public.maintenance_priority
) from public;

grant execute on function public.close_maintenance_request(uuid, text)
  to authenticated;
grant execute on function public.update_my_maintenance_request(
  uuid, text, text, public.maintenance_priority
) to authenticated;

-- =============================================================================
--  3. Kết toán tiền cọc lúc trả phòng
-- =============================================================================

-- Trả phòng trong đời thực luôn là một phép trừ: cọc − tiền còn nợ − hư hỏng.
-- Trước migration này chỉ có `deposit` (số lúc ký) nên con số cuối cùng chỉ nằm
-- trên tờ giấy nháp của chủ trọ, và sáu tháng sau không ai tra lại được.
alter table public.tenancies
  add column if not exists deposit_deduction numeric(12, 0) not null default 0;

alter table public.tenancies
  add column if not exists deposit_refunded numeric(12, 0) not null default 0;

alter table public.tenancies
  add column if not exists settlement_note text;

comment on column public.tenancies.deposit_deduction is
  'Số trừ vào cọc: nợ tiền phòng, điện nước tháng cuối, hư hỏng. Có trừ thì '
  'settlement_note phải nói vì sao.';

comment on column public.tenancies.deposit_refunded is
  'Số thực trả lại người thuê. Thường = deposit - deposit_deduction, nhưng lưu '
  'riêng vì chủ trọ có thể trả làm nhiều lần hoặc bớt cho người ở lâu.';

do $$ begin
  alter table public.tenancies
    add constraint tenancies_settlement_positive
    check (deposit_deduction >= 0 and deposit_refunded >= 0);
exception when duplicate_object then null; end $$;

-- Trừ nhiều hơn số cọc đang giữ là lỗi nhập liệu. Phần người thuê còn nợ vượt
-- quá tiền cọc phải đi vào một hoá đơn, không phải âm tiền cọc.
do $$ begin
  alter table public.tenancies
    add constraint tenancies_deduction_within_deposit
    check (deposit_deduction <= deposit);
exception when duplicate_object then null; end $$;

-- Có trừ thì phải có lý do — giống hệt `invoices_other_needs_note`.
do $$ begin
  alter table public.tenancies
    add constraint tenancies_deduction_needs_note
    check (deposit_deduction = 0 or settlement_note is not null);
exception when duplicate_object then null; end $$;
