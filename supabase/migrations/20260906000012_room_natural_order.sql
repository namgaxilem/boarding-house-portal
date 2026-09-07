-- ============================================================================
--  Xếp phòng theo số, không theo chữ
-- ============================================================================
--
--  `rooms.code` là text, và phải là text: phòng master ở tầng trệt không mang
--  số. Nhưng mười phòng còn lại đánh số 1–10, và `order by r.code` trên text
--  cho ra thứ tự:
--
--      1, 10, 2, 3, 4, 5, 6, 7, 8, 9
--
--  Trang giới thiệu công khai (`/rooms`, và danh sách phòng trống ở trang chủ)
--  đọc thẳng hàm này, nên đó là thứ tự khách nhìn thấy.
--
--  Sửa bằng cách rút phần số ra rồi so sánh bằng số. Phòng không mang số
--  (Master) có `regexp_replace` trả về chuỗi rỗng → `nullif` biến thành NULL →
--  `nulls first` đẩy nó lên đầu tầng của nó, và tầng trệt (floor = 0) vốn đã
--  đứng đầu danh sách.
--
--  `compareRooms()` trong src/lib/db/supabase-adapter.ts xếp theo ĐÚNG quy tắc
--  này cho các danh sách phía admin. Sửa một bên thì phải sửa bên kia.

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
  order by
    r.floor,
    nullif(regexp_replace(r.code, '\D', '', 'g'), '')::bigint nulls first,
    r.code;
$$;
