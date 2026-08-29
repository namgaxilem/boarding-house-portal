-- =============================================================================
--  0006_id_documents.sql — quét CCCD: người thuê gửi, chủ trọ duyệt
--
--  Luồng:
--    1. Người thuê quét mã QR mặt trước CCCD trên điện thoại, chụp thêm 2 mặt.
--    2. Một dòng `id_documents` với status = 'pending' được tạo.
--    3. Chủ trọ mở hồ sơ, đối chiếu ảnh với dữ liệu QR, bấm Duyệt hoặc Từ chối.
--    4. Duyệt xong `approve_id_document()` mới chép số CCCD sang `profiles`.
--
--  Vì sao phải qua bước duyệt: nếu để người thuê ghi thẳng vào `profiles.id_number`
--  thì phải nới policy `profiles_update_own` ở 0004 — và cái đó đang là thứ duy
--  nhất ngăn một người nhập số CCCD của người khác vào hồ sơ mình.
--
--  ⚠️ DỮ LIỆU CÁ NHÂN NHẠY CẢM (Nghị định 13/2023/NĐ-CP, Điều 2.4).
--  Ảnh giấy tờ tuỳ thân nằm ở bucket RIÊNG TƯ, khác hẳn `room-photos` vốn công
--  khai. Không có URL nào xem được nếu không ký; mỗi lần chủ trọ xem đều ghi lại
--  một dòng trong `id_document_access_log`.
--
--  Chạy sau 0005_room_photos.sql.
-- =============================================================================

-- ------------------------------------------------------------------ bảng chính

do $$
begin
  if not exists (select 1 from pg_type where typname = 'id_doc_status') then
    create type public.id_doc_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

create table if not exists public.id_documents (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  status      public.id_doc_status not null default 'pending',

  -- ------------------------------------------------ dữ liệu đọc từ mã QR
  -- Giữ nguyên như quét được, KHÔNG chuẩn hoá ở đây. `profiles` mới là bản đã
  -- được duyệt; bảng này là bằng chứng "người thuê đã gửi cái gì".
  id_number     text,
  old_id_number text,
  full_name     text,
  date_of_birth date,
  gender        text,
  residence     text,
  issued_on     date,

  -- ---------------------------------------------------------------- ảnh
  -- Đường dẫn trong bucket `id-photos`, dạng "<profile_id>/<uuid>-front.webp".
  front_path text,
  back_path  text,

  /** 'qr' = đọc từ mã QR mặt trước, 'manual' = người thuê tự gõ. */
  source text not null default 'qr' check (source in ('qr', 'manual')),

  -- Lý do từ chối, chủ trọ ghi. Người thuê đọc được để biết chụp lại thế nào.
  review_note text,

  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles (id) on delete set null
);

-- Cùng bộ ràng buộc định dạng như `profiles.id_number` ở 0004. Không tái dùng
-- được constraint nên chép lại — sửa một chỗ thì nhớ sửa cả hai.
alter table public.id_documents
  drop constraint if exists id_documents_id_number_format;
alter table public.id_documents
  add constraint id_documents_id_number_format
  check (id_number is null or id_number ~ '^([0-9]{9}|[0-9]{12})$');

-- Mỗi người chỉ có ĐÚNG MỘT hồ sơ đang chờ duyệt. Không có ràng buộc này thì
-- người thuê bấm gửi mười lần là chủ trọ có mười dòng giống nhau phải xử lý.
create unique index if not exists id_documents_one_pending_per_profile
  on public.id_documents (profile_id)
  where status = 'pending';

create index if not exists id_documents_profile_idx
  on public.id_documents (profile_id, submitted_at desc);

-- Hàng chờ của chủ trọ: chỉ quét phần 'pending', không đụng vào lịch sử đã duyệt.
create index if not exists id_documents_pending_idx
  on public.id_documents (submitted_at)
  where status = 'pending';

-- --------------------------------------------------------------- nhật ký xem

-- Nghị định 13/2023 yêu cầu ghi nhận việc xử lý dữ liệu cá nhân nhạy cảm. Bảng
-- này trả lời được câu "ai đã mở ảnh CCCD của tôi, lúc nào".
create table if not exists public.id_document_access_log (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.id_documents (id) on delete cascade,
  viewer_id   uuid references public.profiles (id) on delete set null,
  viewed_at   timestamptz not null default now()
);

create index if not exists id_document_access_log_doc_idx
  on public.id_document_access_log (document_id, viewed_at desc);

-- ------------------------------------------------------------------------ RLS

alter table public.id_documents          enable row level security;
alter table public.id_document_access_log enable row level security;

-- Đọc: chính chủ và chủ trọ. Người ở cùng phòng KHÔNG đọc được.
drop policy if exists id_documents_select on public.id_documents;
create policy id_documents_select on public.id_documents
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- Gửi: chỉ gửi cho chính mình, và chỉ gửi được ở trạng thái chờ duyệt.
-- `status = 'pending'` trong WITH CHECK là chốt chặn thật: thiếu nó thì người
-- thuê POST thẳng vào Server Action với status='approved' là tự duyệt cho mình.
drop policy if exists id_documents_insert_own on public.id_documents;
create policy id_documents_insert_own on public.id_documents
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

-- Xoá: người thuê rút lại hồ sơ CHƯA duyệt của mình (để quét lại), chủ trọ xoá
-- được mọi thứ. Hồ sơ đã duyệt thì người thuê không xoá được — nó là bằng chứng.
drop policy if exists id_documents_delete on public.id_documents;
create policy id_documents_delete on public.id_documents
  for delete to authenticated
  using (
    public.is_admin()
    or (profile_id = auth.uid() and status = 'pending')
  );

-- Sửa: chỉ chủ trọ. Việc duyệt đi qua approve_id_document() bên dưới.
drop policy if exists id_documents_admin_update on public.id_documents;
create policy id_documents_admin_update on public.id_documents
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Nhật ký: người thuê xem được ai đã mở giấy tờ của mình; chủ trọ xem tất.
drop policy if exists id_document_access_log_select on public.id_document_access_log;
create policy id_document_access_log_select on public.id_document_access_log
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.id_documents d
      where d.id = document_id and d.profile_id = auth.uid()
    )
  );

-- Chỉ ghi được dòng mang tên chính mình. Không có UPDATE/DELETE policy nào — cố
-- ý: nhật ký chỉ được thêm, không ai sửa hay xoá được dấu vết của mình.
drop policy if exists id_document_access_log_insert on public.id_document_access_log;
create policy id_document_access_log_insert on public.id_document_access_log
  for insert to authenticated
  with check (viewer_id = auth.uid());

grant select, insert, delete, update on public.id_documents           to authenticated;
grant select, insert                 on public.id_document_access_log to authenticated;
grant all on public.id_documents           to service_role;
grant all on public.id_document_access_log to service_role;

-- ------------------------------------------------------------------- duyệt

-- Duyệt = đổi trạng thái + chép dữ liệu sang `profiles`. Hai việc phải cùng
-- thành công hoặc cùng hỏng: hồ sơ ghi "đã duyệt" mà `profiles.id_number` vẫn
-- rỗng là trạng thái không ai phát hiện ra cho tới lúc công an kiểm tra tạm trú.
--
-- SECURITY DEFINER kèm kiểm tra is_admin() ngay dòng đầu — không phải để nới
-- quyền mà để gói hai câu lệnh vào một giao dịch nguyên tử.
create or replace function public.approve_id_document(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  doc public.id_documents%rowtype;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- FOR UPDATE: hai tab admin cùng bấm Duyệt thì tab thứ hai chờ, đọc lại trạng
  -- thái mới và thoát ở nhánh dưới thay vì chép đè lần nữa.
  select * into doc from public.id_documents where id = p_document_id for update;

  if not found then
    raise exception 'ID_DOCUMENT_NOT_FOUND';
  end if;

  if doc.status <> 'pending' then
    raise exception 'ID_DOCUMENT_ALREADY_REVIEWED';
  end if;

  if doc.id_number is null then
    raise exception 'ID_DOCUMENT_NO_NUMBER';
  end if;

  update public.profiles
  set
    id_number     = doc.id_number,
    -- COALESCE: hồ sơ gửi lên thiếu ngày sinh thì giữ nguyên giá trị chủ trọ đã
    -- nhập tay, không xoá trắng nó.
    date_of_birth = coalesce(doc.date_of_birth, date_of_birth),
    hometown      = coalesce(doc.residence, hometown)
    -- `full_name` CỐ Ý không chép. Tên trên CCCD viết hoa toàn bộ
    -- ("NGUYỄN VĂN A"); chép đè sẽ làm hỏng tên đã hiển thị đẹp trong app. Chủ
    -- trọ nhìn thấy tên trên hồ sơ lúc duyệt và tự sửa nếu lệch.
  where id = doc.profile_id;

  update public.id_documents
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_document_id;
end;
$$;

comment on function public.approve_id_document(uuid) is
  'Duyệt hồ sơ CCCD và chép số sang profiles trong một giao dịch. Chỉ admin.';

revoke all on function public.approve_id_document(uuid) from public, anon;
grant execute on function public.approve_id_document(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- bucket ảnh

-- public = FALSE. Đây là khác biệt quan trọng nhất so với bucket `room-photos`:
-- không tồn tại URL nào mở được ảnh nếu không có chữ ký còn hạn.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'id-photos',
  'id-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Quy ước đường dẫn: "<profile_id>/<uuid>-front.webp". Thư mục cấp một CHÍNH LÀ
-- id người dùng, nên policy chỉ cần so nó với auth.uid() — không phải join sang
-- bảng nào khác.
drop policy if exists "id_photos_read" on storage.objects;
create policy "id_photos_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'id-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "id_photos_insert" on storage.objects;
create policy "id_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'id-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "id_photos_delete" on storage.objects;
create policy "id_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'id-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- Không có policy UPDATE: ảnh giấy tờ đã tải lên thì không sửa, chỉ xoá rồi gửi lại.
