-- =============================================================================
--  0013_posts.sql — bài viết: thông báo nội bộ và bài công khai
--
--  Một bảng, hai khán giả, phân biệt bằng cột `visibility`:
--
--    internal — chỉ người đã đăng nhập đọc được. Thông báo cắt nước, nhắc đóng
--               tiền, nội quy mới. Thừa hưởng `robots: noIndex` của layout gốc.
--    public   — khách vãng lai đọc được, vào sitemap, được Google lập chỉ mục.
--
--  Ai cũng viết được, nhưng CHỈ CHỦ TRỌ ĐĂNG ĐƯỢC. Người thuê gửi bài thì nó vào
--  hàng chờ; chủ trọ duyệt rồi mới hiện — và chính chủ trọ quyết bài nào ra
--  Google. Đó là quyết định biên tập, không phải quyền của người viết.
--
--  Chốt chặn nằm ở WITH CHECK của `posts_insert_own`, không nằm trong Server
--  Action. Server Action là một endpoint POST công khai; RLS mới là cái rào.
--  Cùng hình dạng với `id_documents` ở 0006 và vì đúng một lý do.
--
--  Chạy sau 0012_room_natural_order.sql.
-- =============================================================================

-- ---------------------------------------------------------------- enum types

-- Hai loại thông báo mới. `add value` nằm ở đầu file và KHÔNG được dùng trong
-- chính migration này: Postgres cho thêm giá trị enum trong transaction, nhưng
-- chưa cho dùng giá trị đó cho tới khi transaction commit.
alter type public.notification_type add value if not exists 'post_pending';
alter type public.notification_type add value if not exists 'post_reviewed';

do $$ begin
  -- draft     — tác giả còn đang viết, chưa ai thấy.
  -- pending   — người thuê đã gửi, chờ chủ trọ duyệt. Đây là hàng chờ.
  -- published — đang hiện. `published_at` đã đặt và không đổi nữa.
  -- rejected  — chủ trọ từ chối kèm lý do; tác giả sửa rồi gửi lại.
  -- archived  — đã gỡ khỏi trang. KHÔNG xoá dòng: slug phải giữ chỗ vĩnh viễn,
  --             nếu không một bài mới trùng tiêu đề sẽ chiếm lại đúng URL mà
  --             Google vẫn đang giữ trong chỉ mục.
  create type public.post_status as enum
    ('draft', 'pending', 'published', 'rejected', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.post_visibility as enum ('public', 'internal');
exception when duplicate_object then null; end $$;

-- =============================================================================
--  1. posts
-- =============================================================================

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),

  -- Đường dẫn công khai: /blog/<slug>. UNIQUE trên TOÀN bảng, không chỉ trong số
  -- bài đã đăng — một bản nháp bị xoá rồi mà slug được tái sử dụng thì URL cũ
  -- trong chỉ mục Google trỏ sang nội dung khác hẳn.
  slug         text not null unique,
  title        text not null,
  excerpt      text,
  body         text not null,

  -- Đường dẫn trong bucket `post-images`, dạng "<post_id>/<uuid>.webp".
  cover_path   text,

  status       public.post_status     not null default 'draft',
  visibility   public.post_visibility not null default 'internal',

  -- ON DELETE SET NULL, KHÔNG cascade — khác hẳn id_documents (0006:34). Hồ sơ
  -- CCCD là bằng chứng gắn với một người, xoá người thì xoá luôn là đúng. Bài đã
  -- đăng thì ngược lại: URL của nó đang nằm trong chỉ mục Google và trong tin
  -- nhắn Zalo người ta đã gửi nhau. Chủ trọ dọn tài khoản người thuê cũ không
  -- được phép làm 404 những URL đó.
  author_id    uuid references public.profiles (id) on delete set null,

  -- Bản chụp tên lúc viết. Cần vì `author_id` có thể thành NULL, và vì đổi tên
  -- trong hồ sơ không nên viết lại lịch sử bài đã đăng.
  author_name  text not null,

  published_at timestamptz,

  review_note  text,
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles (id) on delete set null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- slug đã chuẩn hoá: chỉ a-z, 0-9 và dấu nối đơn. Chốt ở DB chứ không chỉ ở
  -- lib/slug.ts, vì Server Action là endpoint POST công khai.
  constraint posts_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80
  ),
  constraint posts_title_len   check (char_length(btrim(title)) between 5 and 160),
  constraint posts_excerpt_len check (excerpt is null or char_length(excerpt) <= 300),

  -- 20.000 ký tự ≈ 4.000 từ ≈ 15 trang A4. Sàn 20 ký tự loại bài rỗng trước khi
  -- nó tới hàng chờ của chủ trọ.
  constraint posts_body_len    check (char_length(btrim(body)) between 20 and 20000),

  -- "đã từng đăng" <=> có published_at. Hai cột này không được rời nhau: một bài
  -- 'published' mà published_at null sẽ bị đẩy khỏi trang 1 vĩnh viễn (sắp xếp
  -- theo ngày đăng) và không ai phát hiện ra.
  constraint posts_published_pairs check (
    (status in ('published', 'archived')) = (published_at is not null)
  ),

  -- Từ chối thì PHẢI có lý do. Cùng nguyên tắc với rejectIdDocument, nhưng chốt
  -- ở DB chứ không chỉ ở zod: người thuê nhận "không hợp lệ" mà không biết sai
  -- chỗ nào sẽ gửi lại y hệt lần nữa.
  constraint posts_rejected_needs_note check (
    status <> 'rejected' or char_length(btrim(coalesce(review_note, ''))) >= 5
  )
);

-- Trang /blog: điều kiện cố định, sắp theo published_at, có LIMIT/OFFSET.
create index if not exists posts_public_feed_idx
  on public.posts (published_at desc)
  where status = 'published' and visibility = 'public';

-- Bảng tin cho người đã đăng nhập: cả public lẫn internal.
create index if not exists posts_feed_idx
  on public.posts (published_at desc) where status = 'published';

create index if not exists posts_pending_idx
  on public.posts (created_at) where status = 'pending';

create index if not exists posts_author_idx
  on public.posts (author_id, created_at desc);

-- HẠN MỨC #1, ở tầng không bỏ qua được: mỗi tác giả chỉ MỘT bài chờ duyệt.
-- Bản sao của id_documents_one_pending_per_profile (0006:74) và vì đúng cùng lý
-- do — không có nó thì bấm Gửi mười lần là chủ trọ có mười dòng. Đây cũng là van
-- thật: tổng nội dung người thuê đăng được bị chặn bởi số lần chủ trọ bấm duyệt,
-- không bởi một con số trong Server Action.
create unique index if not exists posts_one_pending_per_author
  on public.posts (author_id) where status = 'pending';

-- ------------------------------------------------------------- bất biến

create or replace function public.posts_guard_update()
returns trigger
language plpgsql
as $$
begin
  -- Ghim im lặng. RLS không nhìn thấy OLD nên WITH CHECK không chặn được mấy cột
  -- này — nó chỉ ghim được GIÁ TRỊ MỚI, không so được với giá trị cũ.
  new.author_id   := old.author_id;
  new.author_name := old.author_name;
  new.created_at  := old.created_at;
  new.updated_at  := now();

  -- ĐÓNG BĂNG SLUG kể từ lần đăng đầu tiên. Báo lỗi chứ không ghim im lặng: đây
  -- là thứ người dùng CỐ Ý làm và cần biết vì sao không được. App không có bảng
  -- chuyển hướng và next.config.ts không khai redirects() — đổi slug là 404 mọi
  -- link đã chia sẻ, mọi dòng trong sitemap, mọi mục trong chỉ mục Google.
  if old.published_at is not null and new.slug is distinct from old.slug then
    raise exception 'POST_SLUG_LOCKED';
  end if;

  -- published_at đặt đúng một lần. Gỡ bài rồi đăng lại vẫn giữ mốc đăng đầu.
  if old.published_at is not null then
    new.published_at := old.published_at;
  end if;

  return new;
end;
$$;

drop trigger if exists posts_guard on public.posts;
create trigger posts_guard before update on public.posts
  for each row execute function public.posts_guard_update();

-- --------------------------------------------------------------- hạn mức

--  SECURITY DEFINER ở đây là BẮT BUỘC, không phải trang trí: câu đếm phải thấy
--  được mọi dòng của tác giả bất kể policy SELECT về sau có bị siết. Không có
--  nó, một lần siết policy sẽ làm hạn mức im lặng trở thành vô hiệu.
create or replace function public.posts_enforce_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin   boolean;
  v_daily   int;
  v_backlog int;
  v_today   int;
  v_open    int;
begin
  -- service_role (seed, script) vốn đã bỏ qua RLS; trigger không nên là thứ chặn
  -- một migration seed.
  if auth.uid() is null then
    return new;
  end if;

  v_admin   := public.is_admin();
  -- Nhịp thật là 1–2 bài MỖI TUẦN. 3/ngày là thừa thãi cho người dùng thật, và
  -- vẫn chặn một tài khoản bị chiếm ở 3 dòng/ngày. Chủ trọ được 20 vì chủ trọ
  -- làm ngập blog của chính mình không phải mối lo — một vòng lặp lỗi mới là.
  v_daily   := case when v_admin then 20 else 3 end;
  v_backlog := case when v_admin then 20 else 5 end;

  select count(*) into v_today
  from public.posts
  where author_id = new.author_id
    and created_at > now() - interval '24 hours';

  if v_today >= v_daily then
    raise exception 'POST_DAILY_LIMIT';
  end if;

  -- Bịt lỗ bản nháp mà unique index ở trên bỏ ngỏ.
  select count(*) into v_open
  from public.posts
  where author_id = new.author_id
    and status in ('draft', 'pending', 'rejected');

  if v_open >= v_backlog then
    raise exception 'POST_BACKLOG_FULL';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_quota on public.posts;
create trigger posts_quota before insert on public.posts
  for each row execute function public.posts_enforce_quota();

-- ------------------------------------------------------------------- RLS

alter table public.posts enable row level security;

--  KHÁCH VÃNG LAI. Đây là bảng ĐẦU TIÊN trong app cấp quyền cho `anon`
--  (0003_grants.sql ghi "anon không được cấp quyền trên bất kỳ bảng nào" — dòng
--  đó nay có một ngoại lệ, và ngoại lệ này được cấp THEO CỘT, xem phần GRANT).
drop policy if exists posts_select_anon on public.posts;
create policy posts_select_anon on public.posts
  for select to anon
  using (status = 'published' and visibility = 'public');

--  ĐÃ ĐĂNG NHẬP: mọi bài đã đăng (kể cả internal — "internal" nghĩa là dành cho
--  người trong nhà, không phải bí mật), cộng bài của chính mình ở mọi trạng
--  thái, cộng tất cả nếu là chủ trọ.
drop policy if exists posts_select_auth on public.posts;
create policy posts_select_auth on public.posts
  for select to authenticated
  using (
    status = 'published'
    or author_id = auth.uid()
    or public.is_admin()
  );

--  CHỐT CHẶN THẬT, giống hệt id_documents_insert_own (0006:115-122). Thiếu nó thì
--  người thuê POST thẳng vào PostgREST bằng JWT của chính mình với
--  status='published', visibility='public' là tự đăng bài lên trang chủ — không
--  một dòng TypeScript nào chặn được.
--
--  Hai vế riêng biệt, cả hai đều cần:
--    status in ('draft','pending') → không tự đăng được
--    visibility = 'internal'       → không tự đẩy bài ra Google được, kể cả ở
--                                    trạng thái chờ duyệt
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or (
        status in ('draft', 'pending')
        and visibility = 'internal'
        and published_at is null
        and reviewed_at  is null
        and reviewed_by  is null
        and review_note  is null
      )
    )
  );

--  Tác giả sửa bài CHƯA đăng của mình. USING cho phép chạm vào cả 'rejected'
--  (sửa rồi gửi lại); WITH CHECK không cho hạ cánh ở 'rejected' và bắt xoá trắng
--  review_note — gửi lại mà còn dính lý do từ chối cũ thì hàng chờ của chủ trọ
--  đọc như một bài đã bị từ chối.
drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
  for update to authenticated
  using (
    author_id = auth.uid()
    and status in ('draft', 'pending', 'rejected')
  )
  with check (
    author_id = auth.uid()
    and status in ('draft', 'pending')
    and visibility = 'internal'
    and published_at is null
    and reviewed_at  is null
    and reviewed_by  is null
    and review_note  is null
  );

drop policy if exists posts_update_admin on public.posts;
create policy posts_update_admin on public.posts
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

--  Xoá: chủ trọ xoá gì cũng được; tác giả chỉ xoá bài chưa từng đăng. Bài đã đăng
--  thì tác giả KHÔNG xoá được — URL của nó đã ra ngoài. Gỡ bài = archive, và đó
--  là quyết định của chủ trọ. Cùng hình dạng id_documents_delete (0006:127).
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts
  for delete to authenticated
  using (
    public.is_admin()
    or (author_id = auth.uid() and status in ('draft', 'pending', 'rejected'))
  );

-- ----------------------------------------------------------------- GRANT

grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;

--  GRANT THEO CỘT cho anon. RLS lọc DÒNG, không lọc CỘT (cùng lý do đã ghi ở
--  0002_rls.sql khi làm my_roommates()). Không có dòng này thì một `select *`
--  của khách vãng lai trả về cả `review_note` — tức là câu chủ trọ viết riêng cho
--  tác giả, kiểu "ảnh mờ, viết lại giúp tôi" — cùng `reviewed_by` và `author_id`.
--
--  HỆ QUẢ BẮT BUỘC NHỚ: đường đi công khai trong adapter KHÔNG được select("*").
--  Postgres từ chối CẢ CÂU ngay khi chạm một cột chưa cấp. Dùng hằng
--  POST_PUBLIC_SELECT trong supabase-adapter.ts.
grant select (
  id, slug, title, excerpt, body, cover_path,
  author_name, published_at, updated_at, status, visibility
) on public.posts to anon;

-- ------------------------------------------------------ chuyển trạng thái

--  Duyệt / từ chối / đăng / gỡ đi qua hàm, không qua UPDATE trần — cùng lý do
--  approve_id_document() (0006:173): một lệnh, một transaction, và `for update`
--  để hai tab admin cùng bấm Duyệt thì tab thứ hai chờ rồi đọc lại trạng thái
--  mới, thay vì ghi đè reviewed_by và published_at của tab thứ nhất.

create or replace function public.approve_post(
  p_post_id    uuid,
  p_visibility public.post_visibility
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare p public.posts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into p from public.posts where id = p_post_id for update;

  if not found then
    raise exception 'POST_NOT_FOUND';
  end if;
  if p.status <> 'pending' then
    raise exception 'POST_ALREADY_REVIEWED';
  end if;

  update public.posts set
    status       = 'published',
    visibility   = p_visibility,
    published_at = now(),
    review_note  = null,
    reviewed_at  = now(),
    reviewed_by  = auth.uid()
  where id = p_post_id;
end;
$$;

create or replace function public.reject_post(p_post_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare p public.posts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 5 then
    raise exception 'POST_NOTE_REQUIRED';
  end if;

  select * into p from public.posts where id = p_post_id for update;

  if not found then
    raise exception 'POST_NOT_FOUND';
  end if;
  if p.status <> 'pending' then
    raise exception 'POST_ALREADY_REVIEWED';
  end if;

  update public.posts set
    status      = 'rejected',
    review_note = btrim(p_note),
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_post_id;
end;
$$;

--  Chủ trọ đăng bản nháp của chính mình, hoặc dựng lại một bài đã gỡ.
--  `coalesce` giữ mốc đăng đầu tiên: dựng lại không phải là đăng mới.
create or replace function public.publish_post(
  p_post_id    uuid,
  p_visibility public.post_visibility
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare p public.posts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into p from public.posts where id = p_post_id for update;

  if not found then
    raise exception 'POST_NOT_FOUND';
  end if;
  if p.status not in ('draft', 'archived') then
    raise exception 'POST_ALREADY_PUBLISHED';
  end if;

  update public.posts set
    status       = 'published',
    visibility   = p_visibility,
    published_at = coalesce(p.published_at, now()),
    review_note  = null,
    reviewed_at  = now(),
    reviewed_by  = auth.uid()
  where id = p_post_id;
end;
$$;

--  Gỡ bài khỏi trang mà KHÔNG xoá dòng — slug phải giữ chỗ vĩnh viễn.
create or replace function public.archive_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare p public.posts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into p from public.posts where id = p_post_id for update;

  if not found then
    raise exception 'POST_NOT_FOUND';
  end if;
  if p.status <> 'published' then
    raise exception 'POST_NOT_PUBLISHED';
  end if;

  update public.posts set status = 'archived' where id = p_post_id;
end;
$$;

revoke all on function public.approve_post(uuid, public.post_visibility) from public, anon;
revoke all on function public.reject_post(uuid, text)                    from public, anon;
revoke all on function public.publish_post(uuid, public.post_visibility) from public, anon;
revoke all on function public.archive_post(uuid)                         from public, anon;

grant execute on function public.approve_post(uuid, public.post_visibility) to authenticated, service_role;
grant execute on function public.reject_post(uuid, text)                    to authenticated, service_role;
grant execute on function public.publish_post(uuid, public.post_visibility) to authenticated, service_role;
grant execute on function public.archive_post(uuid)                         to authenticated, service_role;

-- =============================================================================
--  2. post_images
-- =============================================================================

--  Một định nghĩa "ai sửa được bài này", dùng cho CẢ bảng ảnh LẪN storage —
--  cùng lập luận với can_attach_maintenance() (0009:43).
create or replace function public.can_edit_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and (
        public.is_admin()
        or (p.author_id = auth.uid() and p.status in ('draft', 'pending', 'rejected'))
      )
  );
$$;

--  Dùng trong policy của post_images. Viết thành hàm SECURITY DEFINER thay vì
--  subquery trần để policy không phải phụ thuộc vào RLS lồng nhau của `posts`.
create or replace function public.post_is_public(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post_id
      and p.status = 'published'
      and p.visibility = 'public'
  );
$$;

create or replace function public.post_is_readable(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post_id
      and (
        p.status = 'published'
        or p.author_id = auth.uid()
        or public.is_admin()
      )
  );
$$;

grant execute on function public.can_edit_post(uuid)     to authenticated, service_role;
grant execute on function public.post_is_public(uuid)    to anon, authenticated, service_role;
grant execute on function public.post_is_readable(uuid)  to authenticated, service_role;

create table if not exists public.post_images (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts (id) on delete cascade,

  -- LUÔN "<post_id>/<uuid>.webp". Thư mục cấp một là id bài, và policy trên
  -- storage.objects đọc đúng phần đó — quy ước này là một phần của mô hình quyền,
  -- không phải một thói quen đặt tên.
  storage_path text not null unique,
  alt          text,
  sort_order   int  not null default 0,

  -- KHÔNG nhận từ client. Trigger đọc lại kích thước thật từ storage.objects —
  -- tin con số client gửi lên thì hạn mức byte chỉ là một lời đề nghị.
  bytes        bigint not null default 0,

  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists post_images_post_idx
  on public.post_images (post_id, sort_order);

create or replace function public.post_images_enforce_quota()
returns trigger
language plpgsql
security definer
set search_path = storage, public, pg_temp
as $$
declare
  v_size   bigint;
  v_count  int;
  v_sum    bigint;
  v_bucket bigint;
begin
  select (o.metadata ->> 'size')::bigint into v_size
  from storage.objects o
  where o.bucket_id = 'post-images' and o.name = new.storage_path;

  if v_size is null then
    raise exception 'POST_IMAGE_NOT_UPLOADED';
  end if;
  new.bytes := v_size;

  select count(*), coalesce(sum(bytes), 0) into v_count, v_sum
  from public.post_images where post_id = new.post_id;

  -- Bìa + 3. Ảnh báo hỏng được 6 vì phiếu sửa chữa cần nhiều góc; một bài viết
  -- thì không.
  if v_count >= 4 then
    raise exception 'POST_IMAGE_LIMIT';
  end if;
  if v_sum + v_size > 1572864 then
    raise exception 'POST_IMAGE_BYTES';
  end if;

  -- Trần TOÀN BUCKET. Gói miễn phí có 1GB dùng chung cho bốn bucket kia nữa, và
  -- blog là thứ duy nhất trong app tăng không giới hạn theo thời gian.
  select coalesce(sum((metadata ->> 'size')::bigint), 0) into v_bucket
  from storage.objects where bucket_id = 'post-images';

  if v_bucket > 268435456 then
    raise exception 'POST_IMAGE_BUDGET_FULL';
  end if;

  return new;
end;
$$;

drop trigger if exists post_images_quota on public.post_images;
create trigger post_images_quota before insert on public.post_images
  for each row execute function public.post_images_enforce_quota();

alter table public.post_images enable row level security;

drop policy if exists post_images_select_anon on public.post_images;
create policy post_images_select_anon on public.post_images
  for select to anon
  using (public.post_is_public(post_id));

drop policy if exists post_images_select_auth on public.post_images;
create policy post_images_select_auth on public.post_images
  for select to authenticated
  using (public.post_is_readable(post_id));

drop policy if exists post_images_insert on public.post_images;
create policy post_images_insert on public.post_images
  for insert to authenticated
  with check (public.can_edit_post(post_id) and uploaded_by = auth.uid());

-- Không có policy UPDATE: sửa một hàng ảnh nghĩa là trỏ nó sang file khác, mà
-- việc đó luôn là xoá + thêm. Cùng quyết định với maintenance_photos (0009).
drop policy if exists post_images_delete on public.post_images;
create policy post_images_delete on public.post_images
  for delete to authenticated
  using (public.is_admin() or public.can_edit_post(post_id));

grant select, insert, delete on public.post_images to authenticated;
grant all on public.post_images to service_role;
grant select (id, post_id, storage_path, alt, sort_order) on public.post_images to anon;

-- ------------------------------------------------------------------ bucket

--  CÔNG KHAI, giống room-photos chứ không giống maintenance-photos. Blog là để
--  công bố: ảnh bìa phải vào được `og:image` (URL ký hạn 10 phút thì thẻ chia sẻ
--  Zalo chết sau mười phút) và vào được next/image với cache một năm.
--
--  Đánh đổi, và phải nói cho người dùng biết ngay tại ô tải ảnh: ảnh đính vào một
--  bài INTERNAL vẫn mở được nếu ai đó đoán trúng uuid. Đừng đính ảnh riêng tư.
--
--  900KB: trình duyệt đã thu ảnh về ~1280px / ~250KB trước khi gửi (lib/image.ts).
--  Con số này là chốt chặn cuối, không phải mức bình thường.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  921600,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------- quyền trên storage.objects

-- Bucket public cho phép đọc qua URL công khai, nhưng policy SELECT vẫn cần để
-- gọi được API storage (liệt kê, lấy metadata).
drop policy if exists "post_images_object_read" on storage.objects;
create policy "post_images_object_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'post-images');

-- `storage.foldername(name)` tách đường dẫn thành mảng; phần tử đầu là id bài.
-- Ép sang uuid ngay tại đây: một tên file không đúng quy ước sẽ lỗi ép kiểu và
-- bị từ chối, thay vì lọt qua vì so chuỗi hụt.
drop policy if exists "post_images_object_insert" on storage.objects;
create policy "post_images_object_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and public.can_edit_post(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "post_images_object_delete" on storage.objects;
create policy "post_images_object_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (
      public.is_admin()
      or public.can_edit_post(((storage.foldername(name))[1])::uuid)
    )
  );

-- =============================================================================
--  3. storage_usage() — khai lại để có bucket thứ năm
-- =============================================================================

--  Migration cũ là bất biến, nên không sửa 0011 mà khai lại ở đây. Thiếu bước
--  này thì /admin/settings báo thiếu dung lượng, và chủ trọ chỉ biết đã chạm trần
--  vào đúng lúc một lần tải ảnh hỏng.
create or replace function public.storage_usage()
returns table (
  bucket       text,
  object_count bigint,
  total_bytes  bigint
)
language plpgsql
security definer
set search_path = storage, public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    o.bucket_id::text                                         as bucket,
    count(*)::bigint                                          as object_count,
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint as total_bytes
  from storage.objects o
  where o.bucket_id in
    ('room-photos', 'id-photos', 'payment-qr', 'maintenance-photos', 'post-images')
  group by o.bucket_id
  order by o.bucket_id;
end;
$$;

revoke all on function public.storage_usage() from public;
grant execute on function public.storage_usage() to authenticated;
