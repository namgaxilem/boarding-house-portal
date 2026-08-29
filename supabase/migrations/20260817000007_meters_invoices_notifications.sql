-- =============================================================================
--  0007_meters_invoices_notifications.sql
--
--  Ba việc trong một migration, vì chúng dính chặt vào nhau:
--
--    1. `meter_readings`  — chỉ số điện nước từng phòng, mỗi tháng một dòng.
--    2. `invoices`        — hoá đơn tháng, dựng từ chỉ số ở trên + giá phòng.
--    3. `notifications`   — thông báo trong app (kèm cờ đã gửi email hay chưa).
--
--  Và một bảng nhỏ nhưng quan trọng về bảo mật:
--
--    4. `gate_credentials` — mã mở cổng / số ngăn vân tay của từng người thuê.
--       CHỈ chủ trọ đọc và ghi. Người thuê KHÔNG đọc được, kể cả của chính mình.
--
--  Vì sao mã cổng phải nằm ở bảng riêng chứ không thêm cột vào `profiles`:
--  RLS lọc theo DÒNG, không lọc theo CỘT. Policy `profiles_select` (0002) cho
--  phép mỗi người đọc dòng của chính mình — thêm cột `gate_code` vào đó là người
--  thuê đọc được ngay bằng một lệnh gọi API, không cần giao diện nào cả.
--
--  Chạy sau 0006_id_documents.sql.
-- =============================================================================

-- ---------------------------------------------------------------- enum types

do $$ begin
  create type public.invoice_status as enum ('draft', 'issued', 'paid', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum
    ('invoice_issued', 'invoice_paid', 'invoice_due', 'general');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------ meter_readings

-- Một dòng = một phòng trong một tháng. `period` luôn là ngày 01 của tháng đó,
-- nên "tháng 08/2026" chỉ có duy nhất một cách viết trong database.
create table if not exists public.meter_readings (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms (id) on delete cascade,
  period         date not null,

  -- Số trên đồng hồ, KHÔNG phải lượng tiêu thụ. Lưu cả đầu và cuối kỳ để tháng
  -- sau đối chiếu được, và để hoá đơn in ra đúng thứ người thuê tự đọc trên
  -- đồng hồ nhà mình.
  electric_start numeric(12, 2) not null default 0,
  electric_end   numeric(12, 2) not null default 0,
  water_start    numeric(12, 2) not null default 0,
  water_end      numeric(12, 2) not null default 0,

  note           text,
  recorded_at    timestamptz not null default now(),
  recorded_by    uuid references public.profiles (id) on delete set null,

  -- extract() chứ không date_trunc(): rẻ hơn và đủ để chốt "phải là ngày 01".
  constraint meter_readings_period_is_month check (extract(day from period) = 1),

  -- Đồng hồ không chạy lùi. Gõ ngược đầu/cuối là lỗi nhập liệu, chặn ngay ở DB
  -- chứ không để nó chảy vào hoá đơn thành số âm.
  constraint meter_readings_electric_forward check (electric_end >= electric_start),
  constraint meter_readings_water_forward    check (water_end >= water_start)
);

comment on table public.meter_readings is
  'Chỉ số điện nước theo tháng. Lượng tiêu thụ = end - start, tính khi đọc.';

create unique index if not exists meter_readings_room_period_idx
  on public.meter_readings (room_id, period);

create index if not exists meter_readings_period_idx
  on public.meter_readings (period desc);

-- ------------------------------------------------------------------ invoices

-- Hoá đơn là ẢNH CHỤP, không phải khung nhìn.
--
-- Mọi đơn giá và số lượng được chép vào đây lúc lập hoá đơn. Tăng giá điện tháng
-- sau KHÔNG được làm đổi số tiền của hoá đơn đã phát hành — đó là lý do bảng này
-- lặp lại `electric_price` / `water_price` thay vì join sang `rooms`.
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.rooms (id)     on delete cascade,
  tenant_id       uuid not null references public.profiles (id)  on delete cascade,

  -- Hợp đồng và chỉ số nguồn: để tra ngược, nhưng hoá đơn vẫn đứng vững nếu hai
  -- thứ đó bị xoá — số tiền đã nằm sẵn trong các cột dưới đây.
  tenancy_id      uuid references public.tenancies (id)      on delete set null,
  reading_id      uuid references public.meter_readings (id) on delete set null,

  period          date not null,

  rent            numeric(12, 0) not null default 0,

  electric_kwh    numeric(12, 2) not null default 0,
  electric_price  numeric(12, 0) not null default 0,
  electric_amount numeric(12, 0) not null default 0,

  water_m3        numeric(12, 2) not null default 0,
  water_price     numeric(12, 0) not null default 0,
  water_amount    numeric(12, 0) not null default 0,

  service_amount  numeric(12, 0) not null default 0,

  -- Khoản phát sinh: sửa vòi nước, mất chìa khoá… Có tiền thì phải có lý do.
  other_amount    numeric(12, 0) not null default 0,
  other_note      text,

  discount        numeric(12, 0) not null default 0,

  -- Cột sinh: không có đường nào để tổng tiền lệch với các dòng cấu thành nó,
  -- kể cả khi ai đó UPDATE thẳng bằng SQL.
  total           numeric(12, 0) generated always as (
                    rent + electric_amount + water_amount
                    + service_amount + other_amount - discount
                  ) stored,

  status          public.invoice_status not null default 'draft',
  due_date        date,
  note            text,

  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id) on delete set null,
  issued_at       timestamptz,
  paid_at         timestamptz,
  /** 'cash' | 'transfer' — ghi lại để đối chiếu sao kê. */
  paid_method     text,

  constraint invoices_period_is_month check (extract(day from period) = 1),
  constraint invoices_amounts_positive check (
    rent >= 0 and electric_amount >= 0 and water_amount >= 0
    and service_amount >= 0 and other_amount >= 0 and discount >= 0
  ),
  constraint invoices_other_needs_note check (other_amount = 0 or other_note is not null),
  constraint invoices_paid_method_known check (
    paid_method is null or paid_method in ('cash', 'transfer')
  ),
  -- Đã thu tiền thì phải có mốc thời gian, và ngược lại.
  constraint invoices_paid_has_timestamp check (
    (status = 'paid' and paid_at is not null) or (status <> 'paid' and paid_at is null)
  )
);

comment on table public.invoices is
  'Hoá đơn tháng. Mọi đơn giá là ảnh chụp lúc lập, không đọc lại từ rooms.';

-- Một phòng một tháng một hoá đơn. Hoá đơn huỷ (void) không tính, để lập lại
-- được sau khi phát hiện nhập sai.
create unique index if not exists invoices_room_period_idx
  on public.invoices (room_id, period)
  where status <> 'void';

create index if not exists invoices_tenant_idx  on public.invoices (tenant_id, period desc);
create index if not exists invoices_period_idx  on public.invoices (period desc);
create index if not exists invoices_unpaid_idx  on public.invoices (due_date)
  where status = 'issued';

-- ------------------------------------------------------------- notifications

-- Thông báo trong app. Email là BẢN SAO của dòng này, không phải kênh riêng:
-- `email_sent_at` cho biết đã gửi hay chưa, nên không bao giờ gửi trùng.
--
-- Chưa có SMS và chưa có push iOS/Android — cố ý. Hai thứ đó cần tài khoản
-- nhà cung cấp và (với push) chứng chỉ APNs; khi nào cần thì thêm cột mốc thời
-- gian tương tự bên cạnh `email_sent_at`.
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  type          public.notification_type not null default 'general',
  title         text not null,
  body          text,
  /** Đường dẫn trong app, ví dụ '/me/invoices/<id>'. */
  link          text,
  invoice_id    uuid references public.invoices (id) on delete cascade,
  read_at       timestamptz,
  email_sent_at timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

-- ---------------------------------------------------------- gate_credentials

-- Mã mở cổng và số ngăn vân tay. CHỈ chủ trọ thấy.
--
-- Người thuê không cần đọc mã của chính mình: họ đã bấm nó ở cổng hàng ngày.
-- Chủ trọ mới là người cần tra "ngăn vân tay số 3 là của ai" khi xoá quyền lúc
-- có người trả phòng. Đây là ghi chép nội bộ, không phải tính năng cho người thuê.
create table if not exists public.gate_credentials (
  profile_id       uuid primary key references public.profiles (id) on delete cascade,
  /** Mã bấm ở bàn phím cổng. */
  gate_code        text,
  /** Ngăn vân tay đã đăng ký trên đầu đọc, ví dụ 'Ngăn 03 - ngón trỏ phải'. */
  fingerprint_slot text,
  note             text,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles (id) on delete set null
);

comment on table public.gate_credentials is
  'Mã cổng / vân tay từng người thuê. Bảng riêng vì RLS lọc dòng chứ không lọc '
  'cột: để trong profiles là người thuê đọc được dòng của mình.';

-- ------------------------------------------------------------------------ RLS

alter table public.meter_readings    enable row level security;
alter table public.invoices          enable row level security;
alter table public.notifications     enable row level security;
alter table public.gate_credentials  enable row level security;

-- ------------------------------------------------------- meter_readings

-- Người thuê xem được chỉ số của PHÒNG MÌNH ĐANG Ở. Hoá đơn đã in ra số kWh
-- rồi; che chỉ số gốc chỉ khiến họ không tự kiểm tra được, không bảo mật thêm gì.
drop policy if exists meter_readings_select on public.meter_readings;
create policy meter_readings_select on public.meter_readings
  for select to authenticated
  using (public.is_admin() or room_id in (select public.my_room_ids()));

drop policy if exists meter_readings_admin_write on public.meter_readings;
create policy meter_readings_admin_write on public.meter_readings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------- invoices

-- Hoá đơn nháp cũng ẩn với người thuê: chủ trọ còn đang sửa số, chưa phát hành.
drop policy if exists invoices_select_own on public.invoices;
create policy invoices_select_own on public.invoices
  for select to authenticated
  using (
    public.is_admin()
    or (tenant_id = auth.uid() and status <> 'draft')
  );

drop policy if exists invoices_admin_write on public.invoices;
create policy invoices_admin_write on public.invoices
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -------------------------------------------------------- notifications

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Người nhận chỉ được đánh dấu đã đọc. Giới hạn "chỉ cột read_at" nằm ở GRANT
-- bên dưới, không nằm ở đây: RLS không phân biệt được cột nào bị sửa.
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_admin_write on public.notifications;
create policy notifications_admin_write on public.notifications
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------- gate_credentials

-- Không có policy nào cho người thuê. Một policy duy nhất, chỉ admin.
drop policy if exists gate_credentials_admin_only on public.gate_credentials;
create policy gate_credentials_admin_only on public.gate_credentials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- GRANTS

grant select, insert, update, delete on
  public.meter_readings,
  public.invoices,
  public.gate_credentials
to authenticated;

-- `notifications` cấp hẹp hơn hẳn ba bảng trên.
--
-- INSERT/DELETE có cấp, nhưng RLS chỉ mở cho admin. UPDATE thì cấp ở TẦNG CỘT:
-- người thuê đổi được `read_at` và không gì khác. Không có lớp này thì họ tự sửa
-- được `title` của thông báo mình nhận — vô hại với người dùng thật, nhưng là
-- một API ghi tuỳ ý vào database, và những thứ đó luôn hữu ích cho kẻ khác.
grant select, insert, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant all on
  public.meter_readings,
  public.invoices,
  public.notifications,
  public.gate_credentials
to service_role;

-- `anon` không được cấp gì. Hoá đơn và thông báo không có phần công khai.
