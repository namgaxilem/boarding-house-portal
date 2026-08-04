/**
 * Tạo tài khoản chủ trọ đầu tiên.
 *
 *   node --env-file=.env.local scripts/create-admin.mjs <email> <mật-khẩu> [họ tên]
 *
 * Vì sao cần script: tài khoản phải đi qua Supabase Auth mới đăng nhập được —
 * insert thẳng vào `profiles` chỉ tạo hồ sơ mồ côi, không có mật khẩu.
 *
 * Trigger `on_auth_user_created` cố tình luôn gán role 'tenant' (không tin
 * user_metadata, xem migration 0001), nên phải nâng quyền bằng một lệnh update
 * riêng chạy dưới service_role.
 *
 * Chạy lại sau mỗi `npm run db:reset` — reset xoá cả auth.users.
 */

import { createClient } from "@supabase/supabase-js";

const [email, password, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ") || "Chủ trọ";

if (!email || !password) {
  console.error(
    "Thiếu tham số.\n" +
      "  node --env-file=.env.local scripts/create-admin.mjs <email> <mật-khẩu> [họ tên]",
  );
  process.exit(1);
}

if (password.length < 6) {
  console.error("Mật khẩu cần ít nhất 6 ký tự.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Chạy `npm run db:status` để lấy, rồi điền vào .env.local.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (error) {
  console.error(`Không tạo được tài khoản: ${error.message}`);
  process.exit(1);
}

const { error: promoteError } = await admin
  .from("profiles")
  .update({ role: "admin", full_name: fullName })
  .eq("id", data.user.id);

if (promoteError) {
  // Đừng để lại một auth user không dùng được.
  await admin.auth.admin.deleteUser(data.user.id);
  console.error(`Không nâng được quyền admin: ${promoteError.message}`);
  process.exit(1);
}

console.log(`Đã tạo tài khoản chủ trọ: ${email}`);
console.log("Đăng nhập tại http://localhost:3000/login");
