-- =============================================================================
--  0010_ttlock_gate.sql — khoá cổng thông minh TTLock
--
--  MỘT khoá cho cả nhà trọ. Nhưng khoá nằm trong BẢNG, không nằm trong biến môi
--  trường: lắp thêm cái thứ hai (cổng sau, khoá cửa từng phòng) về sau chỉ là
--  thêm một dòng, không phải một lần migrate nữa.
--
--  Nguyên tắc xuyên suốt: GHI Ý ĐỊNH VÀO POSTGRES TRƯỚC, gọi API TTLock SAU,
--  cron đối soát THỨ BA. Sóng radio hỏng thì hợp đồng vẫn phải chốt được. Hai
--  trạng thái 'pending' và 'revoking' CHÍNH LÀ hàng chờ — không bảng job, không
--  worker, đúng nếp `hasInvoiceDueReminder()` đã dùng cho việc nhắc hoá đơn.
--
--  Chạy sau 0009_maintenance_photos.sql.
-- =============================================================================

-- ---------------------------------------------------------------- enum types

-- `add value` nằm ở ĐẦU file và KHÔNG được dùng trong chính migration này:
-- Postgres cho thêm giá trị enum trong transaction, nhưng chưa cho dùng giá trị
-- đó cho tới khi transaction commit. Cùng lý do như 0008 dòng 14-19.
alter type public.notification_type add value if not exists 'gate_alert';
alter type public.notification_type add value if not exists 'gate_battery_low';
alter type public.notification_type add value if not exists 'gate_fingerprint_new';

do $$ begin
  create type public.gate_passcode_status as enum
    ('pending', 'active', 'revoking', 'revoked', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gate_passcode_kind as enum ('tenant', 'guest', 'staff');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------- tenancies.expected_end_date

-- `end_date` là SỰ THẬT: ngày người ta thật sự dọn đi, ghi lúc trả phòng.
-- `expected_end_date` là DỰ ĐỊNH: hợp đồng ký 6 tháng thì ghi 6 tháng.
--
-- Hai thứ khác nhau nên là hai cột. Ràng buộc `tenancies_status_matches_end_date`
-- ở 0001 chỉ nói về `end_date`, không đụng tới cột mới này.
alter table public.tenancies
  add column if not exists expected_end_date date;

comment on column public.tenancies.expected_end_date is
  'Ngày hết hạn theo hợp đồng (dự định), khác end_date là ngày trả phòng thật. '
  'Dùng để chặn trên hạn hiệu lực của mã cổng và để nhắc gia hạn.';

-- Chỉ hợp đồng ĐANG Ở mới đáng hỏi "sắp hết hạn chưa".
create index if not exists tenancies_expected_end_idx
  on public.tenancies (expected_end_date)
  where end_date is null and expected_end_date is not null;

-- ---------------------------------------------------------------- gate_locks

-- Một dòng = một ổ khoá vật lý. Hôm nay đúng một dòng: cổng sắt chung.
create table if not exists public.gate_locks (
  id                    uuid primary key default gen_random_uuid(),
  -- id do TTLock cấp — khoá tự nhiên thật sự của dòng này.
  ttlock_lock_id        bigint      not null unique,
  name                  text        not null,
  -- Nhãn chủ trọ tự đặt, hiện trên giao diện: 'Cổng trước'.
  label                 text,
  mac                   text,
  --
  -- NULL = cổng chung cả xóm. Có giá trị = khoá cửa của một phòng cụ thể.
  -- Hôm nay chỉ có đúng một dòng NULL. Cột này tồn tại sẵn để sáu tháng nữa lắp
  -- khoá từng phòng thì chỉ phải thêm dòng.
  room_id               uuid references public.rooms (id) on delete set null,
  -- Khoá mà mã cổng của người thuê đi vào. Đúng một dòng, chốt bằng index dưới.
  is_primary            boolean     not null default true,

  -- --- ảnh chụp trạng thái, cron ghi đè mỗi lần đồng bộ ---
  -- >= 4 mới đặt được mã TỰ CHỌN; 3 thì phải xin mã từ cloud. Đọc về từ thiết bị.
  keyboard_pwd_version  smallint,
  has_gateway           boolean     not null default false,
  battery_percent       smallint,
  last_synced_at        timestamptz,
  last_error            text,

  created_at            timestamptz not null default now()
);

comment on table public.gate_locks is
  'Ổ khoá TTLock. Các cột battery/has_gateway/keyboard_pwd_version là ảnh chụp '
  'của lần đồng bộ gần nhất, không phải sự thật thời gian thực — đọc kèm '
  'last_synced_at.';

-- Chỉ một khoá chính, chặn ở tầng DB để đoạn "cấp mã vào khoá nào" không bao giờ
-- phải chọn giữa hai dòng.
create unique index if not exists gate_locks_one_primary
  on public.gate_locks (is_primary) where is_primary;

-- ------------------------------------------------------------ gate_passcodes

-- Một dòng = một mã bàn phím đã cấp, đang cấp, hoặc đang thu hồi.
--
-- KHÔNG unique theo tenancy_id: một hợp đồng có thể phải cấp lại mã (người thuê
-- lỡ cho bạn biết mã, hoặc lần cấp đầu hỏng giữa chừng). Thứ cần duy nhất là
-- "mỗi hợp đồng chỉ MỘT mã CÒN SỐNG" — chốt bằng partial unique index bên dưới,
-- giống hệt cách `tenancies_one_active_per_tenant` chốt "một người một phòng".
create table if not exists public.gate_passcodes (
  id                 uuid not null default gen_random_uuid() primary key,
  lock_id            uuid not null references public.gate_locks (id) on delete cascade,
  profile_id         uuid not null references public.profiles (id)   on delete cascade,
  -- NULL cho mã khách / mã thợ sửa — mã không gắn hợp đồng nào.
  tenancy_id         uuid references public.tenancies (id) on delete set null,
  kind               public.gate_passcode_kind not null default 'tenant',

  -- Mã thật, chữ số. Chủ trọ phải đọc lại được để đưa cho người thuê.
  code               text not null,
  --
  -- Tên đặt trên khoá, dạng 'NT-P101-3f9a2c1b'. Cột này gánh HAI việc:
  --
  --   1. Là khoá nối duy nhất giữa dòng này và mã trên thiết bị khi lời gọi
  --      keyboardPwd/add hết giờ mà không biết đã tạo hay chưa. Lần đồng bộ sau
  --      liệt kê mã trên khoá rồi khớp theo tên này để gỡ mù.
  --   2. Phân biệt mã DO APP CẤP với mã chủ trọ tự bấm trong app TTLock. App
  --      KHÔNG BAO GIỜ xoá mã không mang tiền tố của mình — đây là điều kiện để
  --      chủ trọ tin được tính năng này.
  remote_name        text not null,
  -- keyboardPwdId của TTLock. NULL cho tới khi TTLock xác nhận đã tạo.
  ttlock_passcode_id bigint,

  status             public.gate_passcode_status not null default 'pending',
  start_at           timestamptz not null default now(),
  end_at             timestamptz not null,

  issued_at          timestamptz,
  revoked_at         timestamptz,
  -- errmsg gần nhất của TTLock, để nguyên tiếng Anh. Giao diện tự dịch.
  last_error         text,
  attempt_count      smallint    not null default 0,
  last_attempt_at    timestamptz,

  created_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id) on delete set null,

  constraint gate_passcodes_end_after_start check (end_at > start_at),
  constraint gate_passcodes_revoked_has_time check (
    (status = 'revoked') = (revoked_at is not null)
  )
);

comment on column public.gate_passcodes.status is
  'pending  = đã sinh mã, chưa chắc đã lên khoá. Cron thử lại.
   active   = TTLock xác nhận, có ttlock_passcode_id.
   revoking = đã quyết định thu hồi, chưa xoá được khỏi khoá. Cron thử lại.
   revoked  = đã biến mất khỏi khoá.
   failed   = thử quá số lần, cần người xem. VẪN CÓ THỂ còn trên khoá.';

comment on column public.gate_passcodes.remote_name is
  'Tên mã trên khoá, có chứa id của dòng này. Là thứ phân biệt mã do app cấp với '
  'mã chủ trọ tự bấm trong app TTLock — và app KHÔNG BAO GIỜ xoá mã không phải '
  'của mình.';

-- Một hợp đồng chỉ có một mã đang sống. 'pending' cũng tính: hai dòng pending là
-- hai mã sắp lên khoá cho cùng một người.
create unique index if not exists gate_passcodes_one_live_per_tenancy
  on public.gate_passcodes (tenancy_id)
  where tenancy_id is not null and status in ('pending', 'active', 'revoking');

create unique index if not exists gate_passcodes_remote_name_idx
  on public.gate_passcodes (lock_id, remote_name);

-- Hàng chờ của cron. Partial vì 95% số dòng rồi sẽ là 'revoked', không ai hỏi tới.
create index if not exists gate_passcodes_pending_idx
  on public.gate_passcodes (status)
  where status in ('pending', 'revoking', 'failed');

create index if not exists gate_passcodes_renewal_idx
  on public.gate_passcodes (end_at) where status = 'active';

create index if not exists gate_passcodes_profile_idx
  on public.gate_passcodes (profile_id, created_at desc);

-- --------------------------------------------------------- gate_fingerprints

-- Đồng bộ MỘT CHIỀU: khoá là nguồn sự thật, app chỉ đọc về, đặt tên, và xoá.
--
-- Đăng ký vân tay bắt buộc phải quét tại đầu đọc — không API nào làm thay được.
-- Nên luồng đúng là: người thuê quét ở cổng -> lần đồng bộ sau app thấy một ngăn
-- lạ -> chủ trọ gắn tên. `profile_id` NULL nghĩa là "chưa ai nhận".
--
-- Đây là thứ thay cho ô `gate_credentials.fingerprint_slot` gõ tay.
create table if not exists public.gate_fingerprints (
  id                    uuid not null default gen_random_uuid() primary key,
  lock_id               uuid   not null references public.gate_locks (id) on delete cascade,
  ttlock_fingerprint_id bigint not null,
  -- Tên khoá tự báo. Thường vô nghĩa ('fingerprint 3'), giữ lại để đối chiếu.
  remote_name           text,
  -- Chủ trọ gắn tay. NULL = ngăn lạ, chưa biết của ai.
  profile_id            uuid references public.profiles (id) on delete set null,
  label                 text,
  note                  text,

  first_seen_at         timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  -- Không còn trong danh sách khoá trả về. Giữ dòng lại — đó là lịch sử.
  removed_at            timestamptz,

  updated_at            timestamptz not null default now(),
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint gate_fingerprints_unique unique (lock_id, ttlock_fingerprint_id)
);

comment on table public.gate_fingerprints is
  'Danh sách vân tay đọc về từ khoá. Đồng bộ một chiều: app KHÔNG đăng ký được '
  'vân tay mới (phải quét tại đầu đọc), chỉ đặt tên và xoá.';

create index if not exists gate_fingerprints_unassigned_idx
  on public.gate_fingerprints (lock_id)
  where profile_id is null and removed_at is null;

-- --------------------------------------------------------------- gate_events

-- Nhật ký ra vào kéo về từ /v3/lockRecord/list.
--
-- `unique (lock_id, ttlock_record_id)` là TOÀN BỘ cơ chế chống trùng: cron kéo
-- lùi 6 tiếng mỗi lần cho chắc, phần chồng lấn bị index này nuốt. Không cần bảng
-- job, không cần lưu con trỏ riêng — con trỏ CHÍNH LÀ max(occurred_at).
create table if not exists public.gate_events (
  id               uuid   not null default gen_random_uuid() primary key,
  lock_id          uuid   not null references public.gate_locks (id) on delete cascade,
  ttlock_record_id bigint not null,

  -- 1=app 3/12=gateway 4=mã bàn phím 7=thẻ từ 8=vân tay 10=chìa cơ 11=bluetooth
  record_type      smallint not null,
  success          boolean  not null default true,
  -- Tên khoá tự báo. Không tin được — chỉ để đối chiếu khi không khớp được id.
  remote_username  text,

  -- Suy ra được thì điền, không thì để NULL. Không đoán bừa theo tên.
  profile_id       uuid references public.profiles (id)          on delete set null,
  passcode_id      uuid references public.gate_passcodes (id)    on delete set null,
  fingerprint_id   uuid references public.gate_fingerprints (id) on delete set null,

  occurred_at      timestamptz not null,
  -- Nguyên văn TTLock trả về. Khi tra một sự cố, thứ cần là bản gốc.
  raw              jsonb,
  created_at       timestamptz not null default now(),

  constraint gate_events_unique unique (lock_id, ttlock_record_id)
);

comment on table public.gate_events is
  'Nhật ký mở cổng. CHỈ chủ trọ đọc — xem phần RLS để biết vì sao người thuê '
  'không xem được, kể cả lượt ra vào của chính mình.';

create index if not exists gate_events_recent_idx
  on public.gate_events (lock_id, occurred_at desc);

create index if not exists gate_events_profile_idx
  on public.gate_events (profile_id, occurred_at desc)
  where profile_id is not null;

-- -------------------------------------------------------- integration_tokens

-- Token OAuth máy-với-máy. KHÔNG phải của người dùng nào cả.
--
-- Đây là bảng DUY NHẤT trong toàn bộ database không có một policy RLS nào — kể
-- cả cho chủ trọ. Access token TTLock mở được cổng nhà; một phiên trình duyệt
-- không có lý do gì đọc được nó. Chỉ service_role (server, cron) chạm tới.
--
-- Tên bảng cố ý chung chung, không phải `ttlock_tokens`: tích hợp sau (Zalo OA,
-- cổng thanh toán) dùng lại được luôn.
create table if not exists public.integration_tokens (
  provider      text primary key,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  account_uid   text,
  updated_at    timestamptz not null default now()
);

comment on table public.integration_tokens is
  'Token OAuth của tích hợp bên thứ ba. Không policy RLS và không GRANT cho '
  'authenticated: chỉ service_role đọc/ghi được.';

-- ------------------------------------------------------------------------ RLS

alter table public.gate_locks         enable row level security;
alter table public.gate_passcodes     enable row level security;
alter table public.gate_fingerprints  enable row level security;
alter table public.gate_events        enable row level security;
alter table public.integration_tokens enable row level security;

-- Ba bảng thiết bị: một policy duy nhất, chỉ chủ trọ. Giống `gate_credentials`.

drop policy if exists gate_locks_admin_only on public.gate_locks;
create policy gate_locks_admin_only on public.gate_locks
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists gate_fingerprints_admin_only on public.gate_fingerprints;
create policy gate_fingerprints_admin_only on public.gate_fingerprints
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------- gate_passcodes

-- Chủ trọ toàn quyền.
drop policy if exists gate_passcodes_admin_write on public.gate_passcodes;
create policy gate_passcodes_admin_write on public.gate_passcodes
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Và MỘT policy hẹp cho người thuê: đọc mã còn sống của hợp đồng đang ở của
-- chính mình, không gì khác.
--
-- Chỗ này CỐ Ý lệch khỏi lập trường admin-only của `gate_credentials`. Lý lẽ cũ
-- ("người thuê không cần đọc mã của chính mình, họ bấm nó ở cổng hàng ngày rồi")
-- đúng khi mã do chủ trọ tự nghĩ ra rồi đọc miệng. Mã MÁY SINH thì người thuê
-- chưa từng biết — phải giao được cho họ bằng đường nào đó, và một trang trong
-- app đã đăng nhập là đường an toàn nhất trong các đường có (hơn SMS, hơn email,
-- hơn mảnh giấy).
--
-- Chỉ SELECT. Phần GRANT bên dưới không cấp update/delete cho authenticated trên
-- bảng này ngoài quyền admin đã có qua policy trên.
drop policy if exists gate_passcodes_own_live on public.gate_passcodes;
create policy gate_passcodes_own_live on public.gate_passcodes
  for select to authenticated
  using (
    status in ('pending', 'active')
    and tenancy_id in (
      select t.id from public.tenancies t
      where t.tenant_id = auth.uid() and t.end_date is null
    )
  );

-- ------------------------------------------------- vì sao nhật ký cũng kín
--
-- Câu hỏi đã cân nhắc: người thuê có nên xem nhật ký ra vào của chính mình?
-- Không, vì ba lý do:
--
--   1. Cổng là CỦA CHUNG cả nhà trọ. "Nhật ký của tôi" trên một cái cổng chung
--      thật ra là "mấy giờ người ở cùng phòng tôi về" — biến app quản lý nhà trọ
--      thành máy theo dõi bạn cùng phòng. Không ai đặt hàng tính năng đó.
--   2. Khoá báo về MÃ, không báo về NGƯỜI. Mã cho mượn vẫn hiện đúng tên chủ mã.
--      Một bản ghi trông như bằng chứng nhưng không phải bằng chứng thì tệ hơn
--      không có bản ghi.
--   3. Không có gì người thuê LÀM ĐƯỢC với dữ liệu này. Nghi mất đồ thì gọi chủ
--      trọ, và chủ trọ tra được.
--
-- Đây cũng là hồ sơ di chuyển của một con người — dữ liệu cá nhân nhạy cảm theo
-- Nghị định 13/2023, đúng lý do dự án đã từ chối lưu ảnh CCCD.
drop policy if exists gate_events_admin_only on public.gate_events;
create policy gate_events_admin_only on public.gate_events
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- `integration_tokens`: KHÔNG có policy nào. RLS bật + không policy = không ai
-- qua được, kể cả chủ trọ. Chỉ service_role (bỏ qua RLS) đọc được.

-- ---------------------------------------------------------------- GRANTS

grant select, insert, update, delete on
  public.gate_locks,
  public.gate_fingerprints,
  public.gate_events
to authenticated;

-- `gate_passcodes` cấp hẹp hơn: người thuê chỉ ĐỌC. Không có INSERT/UPDATE/DELETE
-- cho authenticated thì kể cả policy admin ở trên cũng không ghi được — nên vẫn
-- phải cấp đủ bốn quyền, và RLS mới là thứ chặn người thuê. Cùng khuôn với ba
-- bảng trên; khác biệt nằm ở policy, không nằm ở grant.
grant select, insert, update, delete on public.gate_passcodes to authenticated;

grant all on
  public.gate_locks,
  public.gate_passcodes,
  public.gate_fingerprints,
  public.gate_events,
  public.integration_tokens
to service_role;

-- Cố ý KHÔNG grant `integration_tokens` cho authenticated. Thiếu GRANT thì
-- Postgres báo "permission denied for table" — lỗi ồn ào, đúng ý — chứ không
-- lặng lẽ trả về 0 dòng như khi chỉ bị RLS lọc.
