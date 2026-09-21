-- =============================================================================
--  0016_telegram_assistant.sql — trợ lý Telegram cho chủ trọ
--
--  Chủ trọ nhắn tin cho một bot Telegram, AI đọc dữ liệu nhà trọ và trả lời.
--  Migration này chỉ dựng phần LƯU TRỮ. Phần gọi API nằm ở `src/lib/telegram/`
--  và `src/lib/agent/`.
--
--  Sáu bảng, ba nhóm việc:
--
--    liên kết danh tính   telegram_link_codes · telegram_links · telegram_link_attempts
--    chống xử lý trùng    telegram_updates
--    nhật ký & ngân sách  admin_audit_log · agent_usage
--
--  VÌ SAO `chat_id` MỘT MÌNH KHÔNG BAO GIỜ ĐỦ:
--    1. Webhook là endpoint HTTPS công khai. Rò `TELEGRAM_WEBHOOK_SECRET` thì
--       một `Update` giả với `chat_id` bất kỳ là POST được, và một allowlist
--       trần biến một số nguyên đoán được thành thứ duy nhất chắn cửa admin.
--    2. `chat_id` định danh một CUỘC TRÒ CHUYỆN, không định danh một NGƯỜI.
--       Nhật ký cần `profiles.id`, và việc phân quyền cũng vậy.
--    3. Không có hạn, không thu hồi được, không biết "máy nào".
--  Nên: chứng minh một lần bằng mã sinh từ web (đang đăng nhập), gắn, lưu, và
--  KIỂM LẠI VAI Ở MỖI TIN NHẮN.
--
--  Chạy sau 0015_posts_revoke_anon_table_grants.sql.
-- =============================================================================

-- ------------------------------------------------- 1. mã liên kết một lần

--  Lưu BĂM, không lưu mã. Bảng này rò ra thì người đọc được vẫn không liên kết
--  được gì — cùng lập luận với `api_tokens` sẽ dựng ở đợt MCP.
create table if not exists public.telegram_link_codes (
  code_hash       text primary key,              -- sha256 hex của mã người dùng thấy
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  used_at         timestamptz,
  used_by_chat_id bigint
);

create index if not exists telegram_link_codes_open_idx
  on public.telegram_link_codes (profile_id) where used_at is null;

-- --------------------------------------------------------- 2. liên kết

--  `chat_id` là KHOÁ CHÍNH: một cuộc trò chuyện gắn với đúng một tài khoản.
--  Chiều ngược lại thì mở — một người gắn nhiều máy (nhiều chat_id) vào cùng
--  một profile, và mỗi máy thu hồi riêng được.
create table if not exists public.telegram_links (
  chat_id           bigint primary key,
  profile_id        uuid not null references public.profiles (id) on delete cascade,
  --  Chỉ để hiển thị trong danh sách "đã liên kết máy nào". Người dùng đổi
  --  username Telegram lúc nào cũng được, nên KHÔNG dùng nó để nhận dạng.
  telegram_username text,
  linked_at         timestamptz not null default now(),
  last_seen_at      timestamptz,
  --  Thu hồi = đánh dấu, KHÔNG xoá dòng: xoá thì hàng trong admin_audit_log trỏ
  --  vào hư vô, và một nhật ký không tra ngược được thì không còn là nhật ký.
  revoked_at        timestamptz
);

create index if not exists telegram_links_profile_idx
  on public.telegram_links (profile_id) where revoked_at is null;

--  Chống đoán mã: 5 lần sai mỗi chat mỗi giờ. 40 bit với hạn 10 phút vốn đã
--  không dò được; cái bảng này biến "không dò được" thành "có ghi lại".
create table if not exists public.telegram_link_attempts (
  chat_id      bigint not null,
  attempted_at timestamptz not null default now()
);

create index if not exists telegram_link_attempts_idx
  on public.telegram_link_attempts (chat_id, attempted_at desc);

-- ------------------------------------------------- 3. chống xử lý trùng

--  Telegram gửi lại CÙNG một `update_id` cho tới khi nhận 2xx. Khoá chính chính
--  là toàn bộ cơ chế chống trùng — không cần khoá phân tán, không cần hàng đợi.
--
--  Phải chiếm TRƯỚC khi trả 200, không phải trong `after()`: một lần gửi lại tới
--  trong lúc lượt đầu còn đang chạy sẽ được xử lý hai lần.
create table if not exists public.telegram_updates (
  update_id   bigint primary key,
  received_at timestamptz not null default now()
);

-- --------------------------------------------- 4. nhật ký thao tác admin

--  docs/11 mục 4 ghi "Không có nhật ký thao tác của admin" là một khoảng trống
--  đã biết. Bảng này lấp nó — và với đường đi của bot thì nó BẮT BUỘC phải có,
--  vì đường đó chạy bằng service_role nên RLS không còn ghi lại gì thay ta nữa.
--
--  Ghi cả thao tác ĐỌC (`read_only = true`). Khi dữ liệu liên quan tới người ở
--  trọ thì "ai đã hỏi gì về ai" đúng là thứ một nhật ký sinh ra để trả lời.
create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  --  `set null`, KHÔNG cascade: nhật ký biến mất khi xoá tài khoản thì không
  --  còn là nhật ký. `actor_email` chụp lại ngay lúc ghi để khỏi phải join.
  profile_id  uuid references public.profiles (id) on delete set null,
  actor_email text not null,
  channel     text not null check (channel in ('telegram', 'mcp', 'web')),
  tool_name   text not null,
  read_only   boolean not null,
  args        jsonb not null default '{}'::jsonb,
  outcome     text not null check (outcome in ('pending', 'ok', 'error', 'denied')),
  error_code  text,
  duration_ms integer,
  request_id  text not null
);

create index if not exists admin_audit_log_time_idx
  on public.admin_audit_log (occurred_at desc);
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (profile_id, occurred_at desc);

-- ------------------------------------------------------ 5. ngân sách AI

--  Trần theo NGÀY theo NGƯỜI. `max_iterations` chặn được vòng lặp tool trong
--  MỘT request, nhưng một chuỗi tin nhắn riêng lẻ thì nó không thấy — mà đó mới
--  là cách hoá đơn chạy mất kiểm soát qua đêm.
create table if not exists public.agent_usage (
  profile_id          uuid not null references public.profiles (id) on delete cascade,
  day                 date not null,
  requests            integer not null default 0,
  input_tokens        bigint  not null default 0,
  cached_input_tokens bigint  not null default 0,
  output_tokens       bigint  not null default 0,
  updated_at          timestamptz not null default now(),
  primary key (profile_id, day)
);

-- ------------------------------------------------------- đổi mã lấy liên kết

--  Một lệnh, một transaction: đánh dấu mã đã dùng VÀ gắn chat cùng lúc. Tách ra
--  hai lệnh là mở cửa cho hai tin nhắn `/start` cùng mã chạy song song.
--
--  KHÔNG phải SECURITY DEFINER: người gọi duy nhất là bot, chạy bằng
--  service_role, vốn đã bỏ qua RLS. Thêm SECURITY DEFINER ở đây chỉ tạo thêm
--  một hàm leo thang quyền mà không ai cần.
create or replace function public.redeem_telegram_link_code(
  p_code_hash text,
  p_chat_id   bigint,
  p_username  text default null
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_code    public.telegram_link_codes%rowtype;
  v_role    public.user_role;
  v_active  boolean;
begin
  select * into v_code
  from public.telegram_link_codes
  where code_hash = p_code_hash
  for update;

  if not found                       then raise exception 'TELEGRAM_CODE_INVALID'; end if;
  if v_code.used_at is not null      then raise exception 'TELEGRAM_CODE_USED';    end if;
  if v_code.expires_at <= now()      then raise exception 'TELEGRAM_CODE_EXPIRED'; end if;

  --  Vai được kiểm LẠI ở đây, không tin vào lúc sinh mã: giữa lúc tạo mã và lúc
  --  gõ `/start` có thể đã có một lần hạ quyền.
  select role, is_active into v_role, v_active
  from public.profiles where id = v_code.profile_id;

  if v_role is distinct from 'admin' or not coalesce(v_active, false) then
    raise exception 'TELEGRAM_NOT_ADMIN';
  end if;

  update public.telegram_link_codes
     set used_at = now(), used_by_chat_id = p_chat_id
   where code_hash = p_code_hash;

  insert into public.telegram_links (chat_id, profile_id, telegram_username)
  values (p_chat_id, v_code.profile_id, p_username)
  on conflict (chat_id) do update
     set profile_id        = excluded.profile_id,
         telegram_username = excluded.telegram_username,
         linked_at         = now(),
         revoked_at        = null;

  return v_code.profile_id;
end;
$$;

-- =============================================================================
--  RLS và quyền
-- =============================================================================

alter table public.telegram_link_codes    enable row level security;
alter table public.telegram_links         enable row level security;
alter table public.telegram_link_attempts enable row level security;
alter table public.telegram_updates       enable row level security;
alter table public.admin_audit_log        enable row level security;
alter table public.agent_usage            enable row level security;

--  ⚠️ `revoke` TRƯỚC, luôn luôn. Supabase cấu hình
--  `alter default privileges in schema public grant all on tables to anon,
--  authenticated, service_role`, nên mọi bảng mới sinh ra đã mở toang cho `anon`
--  — RLS là thứ duy nhất chắn lại. Bốn bảng dưới đây KHÔNG có policy nào cho
--  người dùng thường, nên RLS đã chặn sạch; `revoke` là để nếu mai kia ai đó
--  thêm một policy `select` thì họ không vô tình mở kèm cả `delete`.
--  (Bài học từ 0013/0015 — xem docs/13 mục 3.)
revoke all on public.telegram_link_codes    from anon, authenticated;
revoke all on public.telegram_link_attempts from anon, authenticated;
revoke all on public.telegram_updates       from anon, authenticated;
revoke all on public.agent_usage            from anon, authenticated;
revoke all on public.telegram_links         from anon, authenticated;
revoke all on public.admin_audit_log        from anon, authenticated;

grant all on public.telegram_link_codes    to service_role;
grant all on public.telegram_link_attempts to service_role;
grant all on public.telegram_updates       to service_role;
grant all on public.agent_usage            to service_role;
grant all on public.telegram_links         to service_role;
grant all on public.admin_audit_log        to service_role;

--  Hai bảng có mặt trên giao diện /admin/settings/integrations, nên chủ trọ đọc
--  được — nhưng CHỈ ĐỌC. Mọi thao tác ghi đi qua Server Action chạy service_role.
grant select on public.telegram_links  to authenticated;
grant select on public.admin_audit_log to authenticated;

drop policy if exists telegram_links_select on public.telegram_links;
create policy telegram_links_select on public.telegram_links
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

--  Nhật ký: chủ trọ đọc, không ai sửa hay xoá. Không có policy insert/update/
--  delete và cũng không cấp quyền — chỉ service_role ghi. Cùng khuôn với
--  `id_document_access_log` (0006), và vì cùng lý do: một nhật ký sửa được thì
--  vô dụng đúng vào lúc cần tới nó.
drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  for select to authenticated
  using (public.is_admin());

revoke all on function public.redeem_telegram_link_code(text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.redeem_telegram_link_code(text, bigint, text)
  to service_role;
