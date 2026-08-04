# Boarding House Portal — Quản lý nhà trọ

Web quản lý nhà trọ nhỏ (~10 phòng). Hai vai trò:

- **Chủ trọ (admin)** — CRUD phòng, CRUD người thuê, cho nhận/trả phòng, lịch sử phòng, nhật ký sửa chữa, quản lý wifi.
- **Người thuê (tenant)** — xem phòng của mình, wifi, liên hệ chủ trọ, nội quy, sửa thông tin cá nhân.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zustand · Supabase.

---

## 1. Chạy local

App **chỉ chạy với Supabase thật** — không có chế độ giả lập, không mock. Supabase chạy local bằng Docker.

**Cần trước:** Docker Desktop đang chạy, Node 20.9+.

```bash
npm install
npm run db:start
```

Lệnh `db:start` kéo ~10 container Supabase (lần đầu mất vài phút), tạo Postgres, rồi **tự chạy migration + seed**.

Chạy xong nó in ra `API URL`, `anon key`, `service_role key`. Chép vào `.env.local`:

```bash
cp .env.example .env.local
```

Tạo tài khoản chủ trọ đầu tiên rồi khởi động app:

```bash
npm run create-admin -- admin@nhatro.vn Admin@12345 "Nguyễn Văn Tâm"
npm run dev
```

| Thứ | Địa chỉ |
| --- | --- |
| App | http://localhost:3000 |
| Supabase Studio (xem/sửa DB trực tiếp) | http://127.0.0.1:54323 |
| Mailpit (đọc email hệ thống gửi) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Lệnh khác:

```bash
npm run db:status   # in lại URL + key
npm run db:reset    # xoá sạch DB, chạy lại migration + seed
npm run db:stop     # tắt container
```

> `db:reset` xoá cả `auth.users`. Chạy lại `npm run create-admin -- ...` sau mỗi lần reset.

> Key local là key mặc định cố định của Supabase CLI, giống nhau trên mọi máy. Không phải bí mật, nhưng **chỉ dùng cho local** — đừng bao giờ đưa lên server thật.

---

## 2. Sửa thông tin nhà trọ

Mọi thông tin tĩnh nằm ở **một file duy nhất**: `src/config/site.ts`

Tên nhà trọ · địa chỉ · số điện thoại · Zalo · email · số khẩn cấp · số tài khoản ngân hàng · nội quy · đơn giá điện/nước/dịch vụ mặc định · bật/tắt tính năng.

Sửa file đó rồi deploy lại. Không có bảng `settings` trong database — cố ý, để không bao giờ có chuyện hai nơi ghi hai giá trị khác nhau. Trang `/admin/settings` chỉ hiển thị lại nội dung file này để đối chiếu.

Dữ liệu **động** (phòng, người thuê, hợp đồng, wifi) nằm ở database, sửa qua giao diện.

---

## 3. Deploy lên Supabase cloud

Local dùng Docker; lên thật thì trỏ sang project cloud.

### 3.1 Tạo project và đẩy schema

1. Tạo project tại [supabase.com](https://supabase.com) (free tier).
2. Liên kết và đẩy migration:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Hoặc thủ công: mở **SQL Editor** rồi chạy lần lượt 2 file trong `supabase/migrations/`, sau đó `supabase/seed.sql` nếu muốn 10 phòng mẫu.

### 3.2 Điền biến môi trường

Lấy giá trị tại **Project Settings → API**:

| Biến | Lấy ở đâu |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — **bí mật** |

> 🔒 `SUPABASE_SERVICE_ROLE_KEY` **không bao giờ** được đặt tiền tố `NEXT_PUBLIC_`. Biến `NEXT_PUBLIC_*` bị nhúng thẳng vào bundle JavaScript gửi xuống trình duyệt; lộ key này là lộ toàn quyền database, bỏ qua mọi RLS.

### 3.3 Tạo tài khoản chủ trọ đầu tiên

Không thể insert thẳng vào bảng `profiles` — tài khoản phải đi qua Supabase Auth mới đăng nhập được.

1. **Authentication → Users → Add user**: nhập email + mật khẩu, bật *Auto Confirm User*.
2. Trigger `on_auth_user_created` tự tạo dòng trong `profiles` với `role = 'tenant'`.
3. Nâng lên admin, chạy trong SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'email-cua-ban@example.com';
```

Từ đó trở đi, tài khoản người thuê được tạo ngay trong giao diện `/admin/tenants/new`.

### 3.4 Kiểm tra

`GET /api/health` trả `{"ok":true,"database":"up"}` là app đã nối được Postgres thật.

---

## 4. Deploy

Vercel là đường ngắn nhất: import repo, dán biến môi trường, xong.

> ⚠️ **Vercel Hobby cấm dùng cho mục đích thương mại.** Quản lý nhà trọ cho thuê là vùng xám. Nếu muốn sạch điều khoản mà vẫn free: Cloudflare Workers (qua OpenNext) hoặc Netlify. Rủi ro thấp và đảo ngược được — dữ liệu nằm ở Supabase, đổi chỗ chạy mất khoảng một giờ.

Nhớ đặt `NEXT_PUBLIC_SITE_URL` thành domain thật, nếu không link đặt lại mật khẩu trong email sẽ trỏ về `localhost`.

### Vận hành (bắt buộc làm)

Hai GitHub Actions đã có sẵn trong `.github/workflows/`:

| Workflow | Việc | Secrets cần |
| --- | --- | --- |
| `keep-alive.yml` | Ping mỗi ngày. Supabase free **tự pause project sau 7 ngày** không hoạt động | `APP_URL`, `CRON_SECRET` |
| `backup.yml` | `pg_dump` hàng tuần. Supabase free **không có backup tự động** | `DATABASE_URL` |

Backup không phải tuỳ chọn. Mất dữ liệu người thuê là mất thật.

---

## 5. Cấu trúc

```
src/
├─ config/site.ts        ← SỬA THÔNG TIN NHÀ TRỌ Ở ĐÂY
├─ app/
│  ├─ (marketing)/       /, /rooms, /contact          — công khai
│  ├─ (auth)/            /login, /forgot-password, /reset-password
│  ├─ (admin)/admin/     dashboard, phòng, người thuê, hợp đồng, cài đặt
│  ├─ (tenant)/me/       phòng của tôi, wifi, liên hệ, nội quy, cá nhân
│  ├─ auth/callback/     đổi code Supabase lấy session
│  └─ api/               health, cron/keep-alive
├─ features/             auth · rooms · tenants · tenancies · wifi · settings
│                        (mỗi domain: schema.ts + actions.ts + components/)
├─ components/ui/        primitive kiểu shadcn
├─ components/common/    form, page-header, empty-state, confirm-form…
├─ components/layout/    sidebar admin, bottom-nav tenant, user-menu
├─ lib/
│  ├─ db/                repository.ts (interface) + demo-adapter + supabase-adapter
│  ├─ auth/              dal.ts (guard) + session.ts
│  └─ supabase/          server / client / admin / proxy
├─ stores/               Zustand — CHỈ state giao diện
└─ proxy.ts              Next 16 gọi là proxy, trước đây là middleware
```

### Vài quyết định đáng biết

**Phân quyền 3 lớp, cố ý dư.**
`proxy.ts` chặn sớm cho mượt UX → `requireAdmin()` trong layout chạy phía server → RLS chặn ở tầng database. Server Action là endpoint POST công khai, ai biết id cũng gọi được, nên mọi action đều tự gọi `requireAdmin()` chứ không tin proxy.

**GRANT và RLS là hai thứ khác nhau, phải làm cả hai.**
RLS lọc *dòng*, nhưng Postgres vẫn cần GRANT ở tầng *bảng* trước. Thiếu GRANT thì truy vấn báo thẳng `permission denied for table rooms`, không phải trả 0 dòng. Xem `migrations/…_grants.sql`.

**Khách vãng lai không có quyền trên bảng nào.**
Trang giới thiệu lấy phòng trống qua hàm `vacant_rooms()`. Nếu cấp cho `anon` quyền đọc `tenancies` thì RLS trả 0 dòng — và khi đó *mọi* phòng trông như còn trống, kể cả phòng đang có người ở.

**Trigger không tin `user_metadata`.**
`user_metadata` do chính người dùng gửi lên khi đăng ký. Nếu trigger đọc `role` từ đó, ai POST tới `/auth/v1/signup` kèm `{"role":"admin"}` cũng thành chủ trọ. Mọi tài khoản mới đều là `tenant`; nâng quyền phải làm thủ công. Ngoài ra `[auth] enable_signup = false` — app không có đăng ký công khai.

**Trạng thái phòng được suy ra, không lưu.**
Cột `rooms.status` chỉ mang ý định thủ công của chủ trọ (`maintenance` / `reserved`). "Đang ở" hay "còn trống" tính từ việc có hợp đồng còn hiệu lực hay không, nên hai nguồn không bao giờ lệch nhau.

**Đổi backend là một dòng.**
Không trang nào chứa chữ "supabase". Tất cả đi qua `Repository` trong `src/lib/db/repository.ts`; `src/lib/db/index.ts` chọn adapter.

**Giá thuê được chụp ảnh lại.**
`tenancies.monthly_price` lưu giá lúc ký. Tăng giá phòng về sau không sửa lịch sử cũ.

**Người ở cùng đọc qua SQL function, không qua RLS policy.**
RLS lọc theo dòng chứ không theo cột. Mở dòng `profiles` cho bạn cùng phòng là lộ luôn số điện thoại và ghi chú riêng của chủ trọ. Hàm `my_roommates()` trả đúng 3 cột cần hiển thị.

**Không dùng `loading.tsx`.**
Trên Next 16.2 + Turbopack, loading boundary cấp route trên một segment dynamic khiến skeleton kẹt lại, nội dung không bao giờ hiện. Trang nào cần streaming thì dùng `<Suspense>` tường minh trong page — cách này chạy đúng (xem `/admin`).

---

## 6. Lệnh

```bash
npm run dev      # dev server (Turbopack)
npm run build    # build production
npm start        # chạy bản build
npm run lint     # eslint
npx tsc --noEmit # typecheck
```

---

## 7. Chưa làm (Phase sau)

Chat · mã mở cổng/vân tay · ghi chỉ số điện nước · hoá đơn · thông báo · lưu ảnh CCCD & hợp đồng.

Bật/tắt hiển thị các tính năng này ở `houseConfig.features` trong `src/config/site.ts`.
