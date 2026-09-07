-- =============================================================================
--  seed.sql — 11 phòng thật của nhà trọ + wifi
--
--  Chạy SAU các migration.
--
--  KHÔNG tạo người dùng ở đây. Tài khoản phải đi qua Supabase Auth (bảng
--  auth.users) thì mới đăng nhập được — insert thẳng vào `profiles` chỉ tạo ra
--  hồ sơ mồ côi không có mật khẩu.
--
--  Tạo tài khoản chủ trọ đầu tiên: xem README.md, mục "Tạo tài khoản admin".
-- =============================================================================

-- ------------------------------------------------------------------- phòng
--
--  Nhà ống, 11 phòng, đánh số chạy suốt từ tầng 1 lên tầng 3:
--
--    Tầng trệt  │ Master                    │ 1 phòng
--    Tầng 1     │ 1  2  3  4                │ 4 phòng, có gác lửng
--    Tầng 2     │ 5  6  7  8                │ 4 phòng, có gác lửng
--    Tầng 3     │ 9  10                     │ 2 phòng, KHÔNG có gác
--
--  Trong mỗi tầng, số nhỏ nhất là phòng MẶT TIỀN rồi lùi dần vào trong — nhà
--  ống nên các phòng nối nhau theo chiều sâu, không phải hai bên hành lang.
--  Vì vậy phòng đầu mỗi tầng là 1 / 5 / 9.
--
--  `floor = 0` là tầng trệt. Ràng buộc `rooms_floor_positive` cho phép 0.
--
--  ⚠️  DIỆN TÍCH và GIÁ dưới đây là số TẠM để app có gì mà hiện. Đơn giá
--  điện/nước/dịch vụ thì lấy đúng `houseConfig.defaults` trong
--  src/config/site.ts (3.800 / 25.000 / 100.000). Sửa diện tích và giá thuê
--  cho khớp thực tế ở /admin/rooms, hoặc sửa thẳng file này rồi `db:reset`.

insert into public.rooms
  (code, floor, area_m2, base_price, electric_price, water_price, service_price,
   max_occupants, status, description)
values
  -- tầng trệt
  ('Master', 0, 30, 4000000, 3800, 25000, 100000, 3, 'vacant',
   'Phòng master ở tầng trệt, rộng nhất nhà, ra vào thẳng mặt đường.'),

  -- tầng 1
  ('1',  1, 20, 2500000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng mặt tiền tầng 1, có gác lửng.'),
  ('2',  1, 20, 2400000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng giữa tầng 1, có gác lửng.'),
  ('3',  1, 20, 2400000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng giữa tầng 1, có gác lửng.'),
  ('4',  1, 20, 2400000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng trong cùng tầng 1, có gác lửng.'),

  -- tầng 2
  ('5',  2, 20, 2500000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng mặt tiền tầng 2, có gác lửng.'),
  ('6',  2, 20, 2400000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng giữa tầng 2, có gác lửng.'),
  ('7',  2, 20, 2400000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng giữa tầng 2, có gác lửng.'),
  ('8',  2, 20, 2400000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng trong cùng tầng 2, có gác lửng.'),

  -- tầng 3 (trên cùng) — hai phòng này KHÔNG có gác
  ('9',  3, 18, 2200000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng mặt tiền tầng 3, tầng trên cùng, không có gác.'),
  ('10', 3, 18, 2200000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng trong tầng 3, tầng trên cùng, không có gác.')
on conflict (code) do nothing;

-- -------------------------------------------------------------------- wifi
--
--  Một router chung cho cả nhà, cộng thêm router riêng từng tầng có phòng cho
--  thuê. Tầng trệt chỉ có một phòng nên dùng luôn wifi chung, không đặt riêng.

insert into public.wifi_networks (ssid, password, scope, room_id, floor, note)
values
  ('NhaTro-TanPhat', 'doi-mat-khau-nay', 'global', null, null,
   'Wifi chung cả nhà, phủ tầng trệt, cầu thang và sân.'),
  ('NhaTro-Tang1', 'doi-mat-khau-nay-1', 'floor', null, 1,
   'Router đặt ở tầng 1, dùng cho phòng 1–4.'),
  ('NhaTro-Tang2', 'doi-mat-khau-nay-2', 'floor', null, 2,
   'Router đặt ở tầng 2, dùng cho phòng 5–8.'),
  ('NhaTro-Tang3', 'doi-mat-khau-nay-3', 'floor', null, 3,
   'Router đặt ở tầng 3, dùng cho phòng 9–10.');
