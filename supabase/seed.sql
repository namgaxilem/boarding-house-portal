-- =============================================================================
--  seed.sql — dữ liệu mẫu 10 phòng + wifi
--
--  Chạy SAU 0001_schema.sql và 0002_rls.sql.
--
--  KHÔNG tạo người dùng ở đây. Tài khoản phải đi qua Supabase Auth (bảng
--  auth.users) thì mới đăng nhập được — insert thẳng vào `profiles` chỉ tạo ra
--  hồ sơ mồ côi không có mật khẩu.
--
--  Tạo tài khoản chủ trọ đầu tiên: xem README.md, mục "Tạo tài khoản admin".
-- =============================================================================

insert into public.rooms
  (code, floor, area_m2, base_price, electric_price, water_price, service_price,
   max_occupants, status, description)
values
  ('P101', 1, 20, 2500000, 3800, 25000, 100000, 2, 'vacant',
   'Phòng góc, cửa sổ hướng đông, có gác lửng.'),
  ('P102', 1, 24, 2900000, 3800, 25000, 100000, 3, 'vacant',
   'Phòng rộng nhất tầng 1, phù hợp ở ghép.'),
  ('P103', 1, 18, 2300000, 3800, 25000, 100000, 2, 'vacant',
   'Vừa sơn lại, có điều hòa.'),
  ('P104', 1, 20, 2500000, 3800, 25000, 100000, 2, 'vacant', null),
  ('P105', 1, 18, 2300000, 3800, 25000, 100000, 2, 'maintenance',
   'Đang chống thấm trần, dự kiến xong cuối tháng.'),
  ('P201', 2, 22, 2700000, 3800, 25000, 100000, 2, 'vacant',
   'Ban công riêng, thoáng.'),
  ('P202', 2, 20, 2600000, 3800, 25000, 100000, 2, 'vacant', null),
  ('P203', 2, 26, 3200000, 3800, 25000, 100000, 3, 'vacant',
   'Phòng lớn, có bếp riêng và nóng lạnh.'),
  ('P204', 2, 20, 2600000, 3800, 25000, 100000, 2, 'reserved',
   'Đã nhận cọc, vào ở đầu tháng sau.'),
  ('P205', 2, 22, 2800000, 3800, 25000, 100000, 2, 'vacant',
   'Cuối hành lang, yên tĩnh.')
on conflict (code) do nothing;

insert into public.wifi_networks (ssid, password, scope, room_id, floor, note)
values
  ('NhaTro-TanPhat', 'doi-mat-khau-nay', 'global', null, null,
   'Wifi chung cả nhà, dùng cho sân và hành lang.'),
  ('NhaTro-Tang1', 'doi-mat-khau-nay-1', 'floor', null, 1,
   'Router đặt cuối hành lang tầng 1.'),
  ('NhaTro-Tang2', 'doi-mat-khau-nay-2', 'floor', null, 2,
   'Router đặt cuối hành lang tầng 2.');
