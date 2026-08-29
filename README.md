# Boarding House Portal — Quản lý nhà trọ

Web quản lý nhà trọ nhỏ (~10 phòng). Hai vai trò:

- **Chủ trọ (admin)** — CRUD phòng, CRUD người thuê, cho nhận/trả phòng kèm kết toán cọc, lịch sử phòng, nhật ký sửa chữa, quản lý wifi, ghi điện nước, lập hoá đơn, xử lý báo hỏng, báo cáo doanh thu.
- **Người thuê (tenant)** — xem phòng của mình, hoá đơn (in được ra giấy), gửi báo hỏng và theo dõi tới lúc sửa xong, wifi, liên hệ chủ trọ, nội quy, sửa thông tin cá nhân.

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

Tên nhà trọ · địa chỉ · số điện thoại · Zalo · email · số khẩn cấp · nội quy · đơn giá điện/nước/dịch vụ mặc định · bật/tắt tính năng.

Sửa file đó rồi deploy lại. Không có bảng `settings` trong database — cố ý, để không bao giờ có chuyện hai nơi ghi hai giá trị khác nhau. Trang `/admin/settings` chỉ hiển thị lại nội dung file này để đối chiếu.

Dữ liệu **động** (phòng, người thuê, hợp đồng, wifi, **cách nhận tiền**) nằm ở database, sửa qua giao diện.

> **Ngoại lệ: số tài khoản và ảnh QR.** Trước đây chúng cũng nằm ở `site.ts`. Giờ chúng ở database, sửa tại `/admin/settings/payments` — chủ trọ đổi ngân hàng hay thêm QR MoMo không nên cần một lần deploy. `houseConfig.bank` còn đúng hai vai: hiện trên **trang giới thiệu công khai** (khách chưa đăng nhập không có quyền đọc bảng `payment_accounts`), và làm **đường lui** khi chưa có thẻ nào được thêm.

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

Hoặc thủ công: mở **SQL Editor** rồi chạy lần lượt **tất cả** file trong `supabase/migrations/` theo đúng thứ tự tên (0001 → 0009), sau đó `supabase/seed.sql` nếu muốn 10 phòng mẫu. Bỏ sót một file là thiếu bảng, và lỗi sẽ hiện ra ở một trang bất ngờ chứ không phải lúc chạy SQL.

> Migration 0008 và 0009 tạo cả **bucket `payment-qr`** và **`maintenance-photos`**. Chạy bằng `supabase db push` thì bucket được tạo tự động; dán tay vào SQL Editor cũng vậy, vì lệnh `insert into storage.buckets` nằm ngay trong các file đó.

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

## 4. Đăng nhập bằng Google / Facebook / Zalo

Mặc định **tắt hết**. Nút chỉ hiện sau khi bật, và chỉ nên bật khi đã có app id — bật mà chưa có thì người dùng bấm vào gặp lỗi.

### Điều cần hiểu trước

App **không cho tự đăng ký** (`enable_signup = false`). Đăng nhập mạng xã hội **không tạo tài khoản mới** — nó chỉ là cách khác để vào một tài khoản chủ trọ đã tạo sẵn. Email lạ bấm Google sẽ bị từ chối, kèm thông báo bảo liên hệ chủ trọ.

Hệ quả thực tế: **email chủ trọ nhập lúc tạo tài khoản phải trùng đúng email của tài khoản Google/Facebook đó.**

### Google / Facebook — 3 bước, thiếu bước nào cũng không chạy

1. Điền id + secret vào `.env.local`:
   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=
   ```
2. `supabase/config.toml` → `[auth.external.google]` → `enabled = true` → chạy lại `npm run db:stop && npm run db:start`
3. `src/config/site.ts` → `houseConfig.login.google = true`

Redirect URI khai bên Google/Facebook console:

| | |
| --- | --- |
| Local | `http://127.0.0.1:54321/auth/v1/callback` |
| Cloud | `https://<project-ref>.supabase.co/auth/v1/callback` |

> Facebook: nhiều tài khoản không trả về email. Những người đó sẽ đăng nhập thất bại — cố ý, vì không có email thì không biết khớp vào hồ sơ nào.

### Zalo — khác hẳn, và chỉ 2 bước

Supabase **không hỗ trợ Zalo**, nên toàn bộ luồng OAuth do app tự xử lý (`src/lib/auth/zalo.ts` + `src/app/auth/zalo/`). Không cần đụng `config.toml`.

1. `.env.local`: `ZALO_APP_ID=` và `ZALO_APP_SECRET=`
2. `src/config/site.ts` → `houseConfig.login.zalo = true`

Redirect URI khai ở Zalo Developers: `<NEXT_PUBLIC_SITE_URL>/auth/zalo/callback`

**Zalo không trả về email**, nên không thể khớp tài khoản như Google. Luồng dùng ở đây là *liên kết tài khoản*:

1. Người thuê đăng nhập bằng email + mật khẩu như bình thường
2. Vào **Cá nhân** → bấm **Liên kết tài khoản Zalo**
3. Từ lần sau, bấm nút Zalo ở trang đăng nhập là vào thẳng

Nếu app Zalo của bạn đã được duyệt quyền đọc số điện thoại thì bỏ qua được bước 1–2: hệ thống tự khớp theo số điện thoại chủ trọ đã nhập trong hồ sơ.

## 5. Cài app lên điện thoại (PWA)

App cài được lên màn hình chính, mở ra không có thanh địa chỉ, trông như app thật. Không qua CH Play hay App Store, không phải chờ duyệt.

### Logo

Một file nguồn, `assets/logo.svg`, sinh ra tất cả:

```bash
npm run icons
```

| File sinh ra | Cỡ | Dùng ở đâu |
| --- | --- | --- |
| `src/app/icon.png` | 32 | Tab trình duyệt |
| `public/favicon.ico` | 32 | Trình duyệt cũ dò thẳng `/favicon.ico` |
| `src/app/apple-icon.png` | 180 | Màn hình chính iPhone/iPad |
| `public/icons/icon-192.png` | 192 | Android, cửa sổ cài đặt |
| `public/icons/icon-512.png` | 512 | Màn hình chờ khi mở app |
| `public/icons/maskable-192.png` · `-512` | 192 · 512 | Android cắt theo hình launcher |
| `src/app/opengraph-image.png` | 1200×630 | Thẻ xem trước khi gửi link qua Zalo/Messenger |

Next tự chèn thẻ `<link>` và `<meta property="og:image">` cho các file này — không phải khai gì thêm.

**Ý tưởng thiết kế: nhà trọ, không phải "cái nhà".** Một mái nhà, thân chia làm hai tầng bằng một dải ngang, mỗi tầng hai phòng — đó là thứ phân biệt nhà trọ với biểu tượng ngôi nhà bất kỳ. Hai ô hổ phách nằm chéo nhau là hai phòng đang có người ở; chúng cũng là điểm nhìn giữ cho icon không thành một khối trắng.

**Thiết kế cho 32px trước, 512px sau.** Favicon là nơi mọi logo đẹp bị vỡ. Ba ràng buộc rút ra từ việc render thử ở cỡ thật:

- **Hình khối đặc, không nét viền.** Nét mảnh nhoè thành xám khi thu nhỏ.
- **Ít chi tiết, mỗi chi tiết đủ to.** Bốn ô cửa, ô nào cũng ≥ 40px trên khung 512 (≈ 2,5px ở cỡ 32). Bản thử với ba cửa sổ một hàng nhòe thành một vệt gạch ở 32px.
- **Dải ngăn tầng dày 26px.** Một đường ngang dày là chi tiết sống sót tốt nhất khi thu nhỏ, và nó chính là chi tiết mang nghĩa.

**Thay bằng logo của bạn:** ghi đè `assets/logo.svg` rồi chạy lại lệnh trên. File nguồn có thể là `.svg` hoặc `.png` (đổi tên thành `logo.png`), miễn là vuông. Hình chính nên nằm gọn trong 60% ở giữa — Android cắt icon theo hình của launcher (tròn / vuông bo / giọt nước) và xén mất viền.

Nếu đổi màu nền, đổi ở **ba chỗ cùng lúc**, nếu không icon và giao diện sẽ lệch màu nhau: `assets/logo.svg`, hằng `BRAND_BG` trong `scripts/generate-icons.mjs`, và `src/components/common/logo.tsx`.

### Logo trong giao diện

`src/components/common/logo.tsx` vẽ lại cùng hình đó bằng SVG nội tuyến, không tải file ảnh: logo xuất hiện trên mọi trang, và một thẻ `<img>` thì tốn thêm một request và nhấp nháy một nhịp trước khi tải xong.

- `<HouseLogo />` — chỉ dấu hiệu, cỡ đặt bằng `className`.
- `<BrandLockup />` — logo + tên nhà trọ, bấm được. Ba khu (giới thiệu, đăng nhập, quản trị) dùng chung, nên đổi logo là đổi cả ba và tên luôn đọc từ `houseConfig`.

Màu logo **cố ý không theo theme**: giống nhau ở chế độ sáng và tối, như mọi logo.

`assets/logo-mark.svg` là bản không nền, dùng khi in ra giấy — đầu thư, hợp đồng. App không đọc file này.

### Người thuê cài thế nào

| Máy | Cách |
| --- | --- |
| Android / Chrome | Thẻ **"Cài … vào máy"** hiện ở đầu trang `/me`, bấm một nút là xong |
| iPhone / Safari | Không có API cài đặt — Apple không cho. Thẻ đó chuyển thành hướng dẫn 3 bước: Chia sẻ → Thêm vào MH chính → Thêm |
| iPhone / Chrome | Không cài được. Phải mở bằng Safari |

Bấm dấu × trên thẻ là ẩn vĩnh viễn (lưu ở `localStorage`).

### Yêu cầu bắt buộc

**HTTPS.** Không có HTTPS thì service worker không đăng ký, không cài được app, và camera quét CCCD cũng không mở. Vercel/Netlify/Cloudflare có sẵn. Chạy local muốn thử thì `next dev --experimental-https`.

### ⚠️ Nếu sửa `public/sw.js`

Tăng `SW_VERSION` trong **cả hai** file: `public/sw.js` và `src/components/common/service-worker.tsx`. Không tăng thì trình duyệt vẫn chạy bản cũ đã cache và bản vá của bạn nằm im.

Và đọc kỹ khối ghi chú bảo mật ở đầu `sw.js` trước khi thêm bất cứ thứ gì vào cache.

---

## 6. Quét CCCD

Người thuê tự quét CCCD trên điện thoại, chủ trọ duyệt. Trang `/me/identity` (người thuê) và `/admin/identity` (hàng chờ duyệt).

### Đọc mã QR, không OCR

Mặt trước thẻ CCCD/Căn cước có sẵn mã QR chứa 7 trường ngăn bằng `|`: số CCCD, số CMND cũ, họ tên, ngày sinh, giới tính, nơi thường trú, ngày cấp.

Đọc mã đó chính xác tuyệt đối, miễn phí, chạy trong máy, không cần mạng. OCR ảnh thì đọc nhầm 0/O và rụng dấu tiếng Việt, tính tiền theo lượt, và bắt gửi ảnh giấy tờ tuỳ thân sang máy chủ bên thứ ba — thứ Nghị định 13/2023 coi là chuyển giao dữ liệu cá nhân nhạy cảm.

Bộ giải mã: `BarcodeDetector` của hệ điều hành nếu có (Android/Chrome), rơi xuống `zxing-wasm` nếu không (iOS/Safari). File `.wasm` được tự host tại `/zxing_reader.wasm`, chép vào `public/` bởi `postinstall` — mặc định thư viện tải nó từ CDN jsDelivr, tức là mỗi lần quét lộ một request kèm IP người thuê ra ngoài.

Mã mờ không quét được thì điền tay, vẫn gửi được.

### Ba lớp bảo vệ dữ liệu

1. **Người thuê không tự ghi được số CCCD.** Policy `profiles_update_own` (migration 0004) khoá cột `id_number`. Hồ sơ gửi lên nằm ở bảng riêng `id_documents` với trạng thái `pending`; chủ trọ bấm duyệt thì hàm `approve_id_document()` mới chép sang `profiles` — trong một giao dịch, cùng thành công hoặc cùng hỏng.
2. **Bucket `id-photos` là private.** Khác hẳn `room-photos`. Không tồn tại URL nào mở được ảnh nếu không có chữ ký còn hạn; URL ký sống 2 phút và được dựng ngay lúc render.
3. **Có nhật ký truy cập.** Mỗi lần ảnh được ký để hiển thị, một dòng vào `id_document_access_log`. Người thuê xem được ai đã mở giấy tờ của mình.

### Đăng nhập bằng VNeID — không làm được

Không có chương trình developer công khai. Kết nối phải ký với **C06 – Bộ Công an** theo Nghị định 69/2024/NĐ-CP, và thực tế chỉ ngân hàng, viễn thông, công chứng, sàn lớn được duyệt.

Đừng nhầm với **định danh điện tử tổ chức** trên VNeID: cái đó miễn phí và đăng ký trong 5 phút, nhưng nó là *bạn* đăng nhập cổng dịch vụ công với tư cách doanh nghiệp — không cho app bạn nhận login của người khác.

Nếu sau này thật sự cần xác thực CCCD là có thật, đường khả thi là mua dịch vụ xác thực điện tử từ nhà cung cấp đã được cấp phép (VNPT eKYC, Viettel, FPT ID Check) — họ có đường kết nối C06 và bán theo lượt gọi. Đó là *xác thực*, không phải nút "Đăng nhập bằng VNeID".

---

## 7. Ghi điện nước, hoá đơn và thông báo

### Một tháng chạy như thế nào

1. **`/admin/meters`** — chọn tháng, gõ số **cuối kỳ** trên đồng hồ từng phòng. Số đầu kỳ đã điền sẵn từ lần ghi trước, nên đi một vòng nhà trọ chỉ phải gõ một con số mỗi phòng. Mỗi phòng là một form riêng, lưu ngay từng phòng — mạng chập ở phòng thứ tám không làm mất bảy phòng trước.
2. **`/admin/invoices`** → *Lập hoá đơn nháp tháng MM/YYYY*: tạo **nháp** cho mọi phòng đang ở đã có chỉ số. Phòng chưa ghi chỉ số bị bỏ qua và **được báo tên** — không lặng lẽ trôi qua. Lập từng phòng thì vào `/admin/invoices/new`.
3. Soát lại nháp → **Phát hành**. Đến lúc này người thuê mới thấy hoá đơn, và nhận thông báo trong app + email.
4. Nhận được tiền → **Đã thu tiền**, chọn tiền mặt hay chuyển khoản. Người thuê nhận thông báo xác nhận.

Vòng đời: `nháp → chờ thanh toán → đã thu`, và **huỷ** ở bất kỳ đâu. Lập sai thì huỷ rồi lập lại — hoá đơn đã phát hành thì không xoá được, để còn dấu vết đối chiếu.

### Hoá đơn là ảnh chụp, không phải khung nhìn

Tiền phòng lấy từ `tenancies.monthly_price` (giá lúc ký), đơn giá điện nước lấy từ phòng **tại thời điểm lập**, rồi chép hết vào bảng `invoices`. Tăng giá điện tháng sau không làm đổi một đồng nào của hoá đơn cũ.

Tổng tiền là **cột sinh** trong database:

```sql
total generated always as (rent + electric_amount + water_amount
                           + service_amount + other_amount - discount) stored
```

Không có đường nào để tổng lệch với các dòng cấu thành nó — kể cả khi ai đó `UPDATE` thẳng bằng SQL. Tiền từng khoản cũng được tính lại ở server từ *số lượng × đơn giá*; form không có cách nào gửi lên "300 kWh nhưng thu 5 đồng".

### Thông báo trong app + email

| Kênh | Trạng thái |
| --- | --- |
| Thông báo trong app (`notifications`) | ✅ chuông ở header người thuê + trang `/me/notifications` |
| Email | ✅ qua Resend, **tuỳ chọn** |
| SMS | ❌ chưa làm |
| Push iOS/Android | ❌ chưa làm |

Email là **bản sao** của một dòng `notifications`, không phải kênh riêng: cột `email_sent_at` cho biết đã gửi hay chưa nên không bao giờ gửi trùng. Thứ tự luôn là *ghi thông báo trước, gửi email sau* — làm ngược lại thì có ngày người thuê nhận mail về một hoá đơn mà mở app không thấy đâu.

Cấu hình email (không bắt buộc):

```bash
RESEND_API_KEY=            # https://resend.com — free 3.000 email/tháng
EMAIL_FROM="Nhà trọ Tân Phát <no-reply@domain-cua-ban.com>"
```

Thiếu hai biến này app vẫn chạy đủ — thông báo vẫn hiện trong app, chỉ không có bản gửi vào hộp thư. `EMAIL_FROM` phải thuộc domain đã xác thực trong Resend.

**Nhắc hạn tự động**: `GET /api/cron/invoice-reminders` (cần `CRON_SECRET`) nhắc mọi hoá đơn đã phát hành mà quá hạn. Mỗi hoá đơn nhắc **đúng một lần** — endpoint tự kiểm bằng `notifications`, nên chạy hàng ngày cũng không spam.

### Nhận tiền: số tài khoản và ảnh QR

`/admin/settings/payments`. Chủ trọ tự thêm bao nhiêu cách nhận tiền tuỳ ý — Vietcombank, QR MoMo, QR quầy tạp hoá — và tự sắp thứ tự. Thẻ **đầu tiên** là thứ 90% người thuê sẽ dùng, nên thứ tự ở trang đó chính là thứ tự trên hoá đơn.

| Loại | Nhập gì |
| --- | --- |
| Số tài khoản | Ngân hàng · số tài khoản · chủ tài khoản |
| Ảnh QR | Một ảnh JPG/PNG/WebP ≤ 2MB |

**Không sinh mã VietQR.** Chủ trọ đã có sẵn ảnh QR trong app ngân hàng — chụp màn hình rồi tải lên là xong: không phải tra mã BIN, không phụ thuộc một chuẩn có thể đổi, và cùng một chỗ đó dùng được cho cả MoMo/ZaloPay lẫn QR in ra dán ở cổng.

Ảnh dưới 1MB được giữ **nguyên bản**, không nén — mã QR là ảnh nét cạnh, nén lại chỉ có hại. Chỉ ảnh chụp bằng camera (một tờ QR dán ở quầy) mới vượt ngưỡng đó và được thu nhỏ.

Bucket `payment-qr` để **public**, khác hẳn `id-photos`. Mã QR là thứ càng nhiều người quét càng tốt, và nó chỉ mã hoá đúng số tài khoản vốn đã in trên mọi hoá đơn. Ghi và xoá vẫn chỉ admin.

**Tắt chứ không xoá** khi đổi ngân hàng: thẻ cũ biến mất khỏi hoá đơn ngay, nhưng số tài khoản còn đó để đối chiếu những lần chuyển đã nhận. Người thuê chỉ đọc được thẻ đang bật — policy `payment_accounts_select`.

**Ảnh QR không thay được tại chỗ.** Sửa thẻ QR chỉ đổi được nhãn, ghi chú và bật/tắt; muốn ảnh khác thì xoá thẻ rồi thêm thẻ mới. Cho phép thay ảnh mà giữ nhãn là mở đường cho cảnh nhãn ghi một ngân hàng còn ảnh quét ra một tài khoản khác.

### In hoá đơn ra giấy / lưu PDF

Nút **In / Lưu PDF** ở trang chi tiết hoá đơn, cả hai bên. Gọi thẳng `window.print()` — hộp thoại in của mọi trình duyệt đều có sẵn "Lưu thành PDF".

Không dùng thư viện sinh PDF: một thư viện như thế là **nơi thứ hai** định nghĩa hoá đơn trông như thế nào, và hai nơi thì sớm muộn lệch nhau. Bản in dựng từ chính HTML đang hiện nên không bao giờ lệch với bản trên màn hình.

Bản in khác bản màn hình ba chỗ, cố ý:

- **Đầu trang** có tên nhà trọ, địa chỉ, liên hệ và mã hoá đơn (8 ký tự đầu của uuid) — trên màn hình những thứ đó nằm ở thanh bên và trên URL, tờ giấy thì không có.
- **Chân trang** có hai ô ký. Nhà trọ thu tiền mặt vẫn cần một tờ có chữ ký hai bên — đó là toàn bộ lý do người ta in hoá đơn ra thay vì mở app.
- **Luôn là mực đen trên giấy trắng.** Người thuê để máy ở chế độ tối rồi bấm In sẽ nhận về một trang đen kịt nếu không có khối `@media print` ghi đè lại bộ token màu (xem `src/app/globals.css`).

Ảnh QR **được giữ lại** khi in — in ra vẫn quét được.

### Mã mở cổng / vân tay — chỉ chủ trọ

Xem và sửa ở `/admin/tenants/<id>`. Người thuê **không có** trang nào đọc được, kể cả mã của chính họ: họ bấm nó ở cổng hàng ngày, còn người cần tra "ngăn vân tay số 3 là của ai" là chủ trọ, lúc có người trả phòng.

Vì sao là bảng riêng `gate_credentials` chứ không thêm cột vào `profiles`: **RLS lọc dòng, không lọc cột.** Policy `profiles_select` cho mỗi người đọc dòng của chính mình — thêm `gate_code` vào đó là người thuê đọc được ngay bằng một lệnh gọi API, không cần giao diện nào cả.

### Chat — đã bỏ khỏi kế hoạch

Nhà trọ 10 phòng đã có Zalo và số điện thoại chủ trọ. Một hộp chat trong app chỉ thêm một nơi nữa phải kiểm tra tin nhắn, mà việc gấp thì người ta vẫn gọi điện.

**Báo hỏng thì khác, và đã làm** (mục 8). Nó không phải chỗ nhắn tin: nó là một việc *chưa xong* có trạng thái theo dõi được, và cần dính vào phòng để sau này tra "phòng này hỏng bình nóng lạnh mấy lần rồi". Zalo không làm được điều đó.

---

## 8. Báo hỏng

`/me/maintenance` (người thuê) · `/admin/maintenance` (chủ trọ).

### Ai làm được gì

| | Gửi phiếu | Sửa phiếu | Đổi trạng thái | Đóng phiếu | Xoá |
| --- | --- | --- | --- | --- | --- |
| **Người thuê** | phòng mình đang ở | phiếu **của mình**, và chỉ khi còn *Chờ xử lý* | ❌ | phiếu **của mình**, bất cứ lúc nào | ❌ |
| **Chủ trọ** | mọi phòng | mọi phiếu | mọi phiếu | mọi phiếu | mọi phiếu |

Vòng đời: `chờ xử lý → đang sửa → đã sửa xong → đã đóng`.

Người thuê **đóng được phiếu của chính mình mà không cần chủ trọ duyệt**: cái vòi tự hết rò, hoặc họ báo nhầm. Bắt chờ duyệt một việc như thế chỉ làm hàng chờ dài ra bằng những phiếu không còn ai quan tâm.

Chủ trọ động vào rồi (*đang sửa*) thì người thuê **không sửa được nữa** — có thêm thông tin thì gửi phiếu mới hoặc gọi điện. Sửa một phiếu mà thợ đã đọc là đổi hiện trường sau khi người ta đã đi xem.

### Hai cửa hẹp thay cho một policy rộng

Người thuê **không có policy UPDATE nào** trên `maintenance_requests`. Hai việc họ được làm đi qua hai hàm `SECURITY DEFINER`:

    close_maintenance_request(request_id, note)
    update_my_maintenance_request(request_id, title, description, priority)

Vì sao không phải một policy UPDATE: **RLS lọc dòng, không lọc cột.** Một policy cho người thuê sửa dòng của mình đồng thời cho họ tự đặt `status = 'resolved'` — và một hàng chờ mà người gửi tự đánh dấu xong thì không còn là hàng chờ. Hàm SQL chỉ chạm đúng ba cột, và kiểm "phiếu của tôi" + "còn chờ xử lý" trong cùng một giao dịch.

### Chi phí sửa không nằm ở bảng phiếu

`maintenance_requests` **không có cột `cost`** — cùng lý do như trên: người thuê phải đọc được dòng phiếu của mình để theo dõi trạng thái, nên mọi cột trong đó đều là cột họ đọc được bằng một lệnh gọi API. Giá thợ báo cho chủ trọ không phải việc của họ.

Nhập chi phí lúc chuyển sang *Đã sửa xong* thì nó thành một dòng `room_events` (`type = 'maintenance'`) — bảng vốn đã chỉ mở cho admin và vốn đã có cột `cost`. Nhật ký sửa chữa của phòng vì thế vẫn là một chỗ duy nhất.

### Người ở cùng phòng thấy phiếu của nhau

Cố ý. Hai người cùng báo một cái vòi hỏng thì chủ trọ nhận hai phiếu trùng; thấy được nhau thì người thứ hai biết việc đã có người báo rồi.

Nhưng chỉ thấy **phiếu**, không thấy người: join sang `profiles` lấy đúng `id` và `full_name`, không lấy `*`. Một join rộng ở đây sẽ kéo theo số điện thoại lẫn ghi chú riêng của chủ trọ về bạn cùng phòng — đúng cái bẫy mà `my_roommates()` được viết ra để tránh.

### Ảnh đính kèm

"Vòi nước bếp bị rò" không nói được là rò ở cổ vòi hay ở ống dưới bồn — chủ trọ vẫn phải đi xem một chuyến trước khi gọi thợ mang đồ. Một tấm ảnh bỏ được chuyến đó.

Tối đa **6 ảnh mỗi phiếu**, 5 ảnh mỗi lần tải. Ai đính được: chủ trọ với mọi phiếu, người gửi với phiếu của mình — và chỉ khi phiếu **chưa đóng**. Người ở cùng phòng xem được ảnh nhưng không thêm được.

Ảnh gửi lúc nào? **Sau khi gửi phiếu**, ở trang chi tiết — phiếu phải tồn tại trước thì ảnh mới có chỗ để thuộc về.

**Bucket `maintenance-photos` là RIÊNG TƯ**, khác `room-photos` (quảng cáo) và `payment-qr` (càng nhiều người quét càng tốt). Đây là ảnh chụp trong phòng người ta ở: cái bồn rửa, góc bếp, đôi khi cả đồ đạc cá nhân lọt vào khung hình. Chỉ mở được bằng URL ký hạn 10 phút, dựng ngay lúc render. Thẻ `<Image>` để `unoptimized` — để Next tối ưu và cache lại thì bản cache sống lâu hơn chữ ký, tức là ảnh riêng tư nằm trong cache của máy chủ ảnh, đúng thứ bucket private được dựng ra để tránh.

Đường dẫn file **luôn** dạng `<request_id>/<uuid>.<ext>`. Đó không phải chuyện thẩm mỹ: policy trên `storage.objects` đọc thư mục đầu tiên để biết ảnh thuộc phiếu nào. Đổi quy ước này là mở toang bucket.

Hai hàm SQL `can_view_maintenance()` và `can_attach_maintenance()` là **một** định nghĩa quyền, dùng cho cả bảng lẫn storage. Viết lại điều kiện ở hai nơi là cách chắc chắn để sáu tháng sau chúng lệch nhau, và cái lệch đó luôn nghiêng về phía mở rộng hơn cần thiết.

**Kích thước — bốn tầng, cố ý dư:**

| Tầng | Chặn gì | Ở đâu |
| --- | --- | --- |
| 1 | File > 25MB, từ chối **trước khi giải mã** | `request-photos.tsx` |
| 2 | Thu về ≤1600px / ~300–500KB | `lib/image.ts` |
| 3 | Kiểu file, > 5MB, > 5 ảnh/lần, > 6 ảnh/phiếu | Server Action |
| 4 | > 5MB, chỉ JPG/PNG/WebP | Bucket Supabase |

Tầng 1 tồn tại vì `createImageBitmap` giải nén cả tấm ảnh vào bộ nhớ — một file 60MB làm điện thoại tầm trung đứng hình, và người dùng chỉ thấy app "hỏng" chứ không thấy lý do. Tầng 3 tồn tại vì Server Action là endpoint POST công khai: bỏ nó thì tầng 1 và 2 chỉ còn là gợi ý.

### Liên hệ chủ trọ luôn nằm trong tầm tay

Cả ba trang báo hỏng của người thuê đều có thẻ **liên hệ chủ trọ** với nút gọi và Zalo. Phiếu đánh dấu *Khẩn cấp* thì thẻ chuyển đỏ và đẩy **số khẩn cấp** ra trước.

Lý do: trang báo hỏng được mở đúng lúc có thứ hỏng, và có những thứ hỏng — rò điện, ngập nước — thì không nên gửi phiếu rồi ngồi chờ. Số điện thoại phải nằm ngay trên màn hình đang mở, không phải sau hai lần chạm.

Thẻ đọc từ `houseConfig` chứ không từ database: một trang liên hệ phụ thuộc vào truy vấn là một trang có thể trắng đúng lúc cần nhất.

### Thông báo

- Người thuê gửi phiếu → **mọi chủ trọ đang hoạt động** nhận thông báo (`maintenance_new`). Nhà trọ có thể có hai tài khoản chủ trọ, và một cái vòi rò thì ai rảnh trước xử lý trước.
- Chủ trọ đổi trạng thái → **người gửi phiếu** nhận thông báo (`maintenance_update`), kèm ghi chú chủ trọ viết.
- Người đổi trạng thái chính là người gửi (chủ trọ tự ghi hộ rồi tự đóng) thì **không gửi gì** — email báo cho chính người vừa bấm nút chỉ dạy người ta bỏ qua email của nhà trọ.

Ghi chú đi **kèm** lần đổi trạng thái, không phải một ô riêng bấm lưu sau: một lần cập nhật = một thông báo, và thông báo đó mang theo lời giải thích.

---

## 9. Trả phòng và kết toán tiền cọc

`/admin/tenancies/<id>/checkout`.

Trả phòng ngoài đời luôn là một phép trừ: **cọc − tiền còn nợ − hư hỏng = trả lại**. Trước đây phép trừ đó nằm trên tờ giấy nháp của chủ trọ, và sáu tháng sau không ai tra lại được vì sao chỉ hoàn từng ấy.

Form trả phòng giờ:

1. **Cảnh báo hoá đơn chưa thu** của chính người đó, và **điền sẵn** số trừ = số còn nợ (tối đa bằng số cọc đang giữ).
2. **Thực hoàn lại** điền sẵn = cọc − số trừ, nhưng **sửa được** — chủ trọ có thể trả làm hai lần, hoặc bớt cho người ở lâu. Con số cuối cùng vẫn do người ký quyết định.
3. **Bắt buộc ghi lý do** khi có trừ. Ràng buộc `tenancies_deduction_needs_note` chốt lại ở tầng database, giống hệt `invoices_other_needs_note`.

Ba ràng buộc nằm trong database, không chỉ trong form:

```sql
deposit_deduction >= 0 and deposit_refunded >= 0
deposit_deduction <= deposit          -- trừ quá số cọc đang giữ là lỗi nhập liệu
deposit_deduction = 0 or settlement_note is not null
```

Trừ nhiều hơn số cọc thì phần vượt quá là một **khoản nợ**, phải đi vào một hoá đơn — không phải âm tiền cọc.

**Trả phòng không tự đóng hoá đơn.** Hoá đơn cũ vẫn ở trạng thái *chờ thanh toán* cho tới khi chủ trọ ghi nhận đã thu. Tự động chuyển sang "đã thu" vì vừa trừ cọc là ghi một khoản thu chưa hề xảy ra vào sổ.

Kết toán được ghi vào cả `tenancies` lẫn **nhật ký phòng** (`room_events`). Ba tháng sau, câu hỏi "sao phòng này chỉ hoàn 1,5 triệu" được trả lời ở chỗ người ta tìm — trang phòng — chứ không phải trong một hợp đồng đã đóng.

---

## 10. Báo cáo doanh thu

`/admin/reports`. Khoảng 6 / 12 / 24 tháng.

Tính từ **hoá đơn đã phát hành**. Nháp không tính (người thuê chưa thấy), hoá đơn huỷ không tính (không còn là tiền phải thu).

| Cột | Nghĩa |
| --- | --- |
| Đã lập | Tổng hoá đơn `issued` + `paid` của tháng đó |
| Đã thu | Phần `paid` trong số trên |
| Còn nợ | Hiệu của hai cột trên |
| Điện · Nước | Tổng kWh / m³ đã tính tiền |

Biểu đồ cột dựng bằng `div`, không thêm thư viện. Mọi thư viện biểu đồ đủ dùng đều nặng hơn toàn bộ phần còn lại của trang, và chúng render ở client nên biểu đồ sẽ nhấp nháy sau khi trang đã hiện. Mỗi cột chia hai phần — đã thu (đặc) chồng dưới còn nợ (nhạt) — nên nhìn vào là thấy tháng nào thu đủ, tháng nào còn treo.

Khung tháng dựng từ **khoảng đã chọn**, không dựng từ dữ liệu: tháng không thu được đồng nào hiện thành cột 0 chứ không biến mất khỏi biểu đồ — đó chính là tháng chủ trọ cần nhìn.

Bảng "theo phòng" giúp bắt **rò ống nước**: phòng nào m³ cao bất thường nhiều tháng liền thường là rò, không phải dùng nhiều.

> Tháng đang chạy dở luôn thấp vì hoá đơn chưa lập xong. Đó không phải một tháng sụt giảm.

---

## 11. Trang tổng quan — "Cần xử lý"

Thẻ đầu tiên trên `/admin`, đứng **trên** sơ đồ phòng: mở trang tổng quan ra, câu hỏi đầu tiên luôn là "hôm nay phải làm gì", không phải "phòng nào đang trống".

Mỗi dòng là một việc **có thể làm xong**, và dẫn thẳng tới chỗ làm nó:

- báo hỏng khẩn cấp · báo hỏng chờ xử lý
- hoá đơn quá hạn (kèm số tiền)
- hồ sơ giấy tờ chờ duyệt
- phòng chưa ghi chỉ số tháng này (kèm mã phòng)
- hoá đơn còn ở dạng nháp

Hết việc thì thẻ **đổi hẳn** thành một dòng xanh "Không còn việc tồn". Một thẻ rỗng đứng đó hàng ngày sẽ được mắt bỏ qua, rồi cái ngày nó có nội dung thật cũng bị bỏ qua nốt.

Sidebar có **huy hiệu số** trên đúng hai mục: *Báo hỏng* và *Giấy tờ*. Đó là hai chỗ **người khác tạo ra việc** cho chủ trọ; mọi mục còn lại là việc chủ trọ tự chủ động vào làm, và một con số đỏ ở đó chỉ dạy người ta bỏ qua huy hiệu.

> ⚠️ Huy hiệu được truyền xuống thanh điều hướng dưới dạng **promise chưa await**, đọc bằng `use()` trong một `<Suspense>` riêng. Đếm việc tồn cần biết tháng hiện tại, mà dưới Cache Components thì mọi thứ đụng vào thời gian hiện tại là dữ liệu thời-điểm-yêu-cầu — `await` nó trong layout làm cả vỏ trang `/admin` thôi không prerender được, và mọi `<Suspense>` trong các trang con kẹt lại ở fallback. Cùng lý do đó, `getAdminTodo()` gọi `await connection()` **ngoài** `cache()`: gói cả hai vào trong thì lần render thứ hai nhận lại promise đã ghi nhớ và `connection()` không chạy nữa.

---

## 12. Deploy

Vercel là đường ngắn nhất: import repo, dán biến môi trường, xong.

> ⚠️ **Vercel Hobby cấm dùng cho mục đích thương mại.** Quản lý nhà trọ cho thuê là vùng xám. Nếu muốn sạch điều khoản mà vẫn free: Cloudflare Workers (qua OpenNext) hoặc Netlify. Rủi ro thấp và đảo ngược được — dữ liệu nằm ở Supabase, đổi chỗ chạy mất khoảng một giờ.

Nhớ đặt `NEXT_PUBLIC_SITE_URL` thành domain thật, nếu không link đặt lại mật khẩu trong email sẽ trỏ về `localhost`.

### Múi giờ — đã xử lý trong code, không cần biến môi trường

Máy chủ chạy UTC (Vercel, Cloudflare, phần lớn container), nhưng app **không đọc múi giờ của máy chủ**. Mọi mốc thời gian được hiển thị theo `houseConfig.timeZone` (`Asia/Ho_Chi_Minh`) bằng `Intl.DateTimeFormat` — xem `src/lib/format.ts`.

Không cần đặt `TZ` ở host, và đặt cũng không đổi gì. Đổi múi giờ thì sửa `src/config/site.ts`.

> Bộ test chạy với `TZ=UTC` (xem `vitest.config.ts`) đúng để chứng minh điều đó: nếu hiển thị bám theo máy chủ, các assertion về giờ Việt Nam sẽ lệch 7 tiếng và CI đỏ ngay.

Ngày tháng thuần (`due_date`, `start_date`, kỳ tính tiền) được cắt bằng chuỗi chứ không qua `Date` — "2026-09-05" là ngày 05/09 ở mọi máy chủ, và đem nó đi đổi múi giờ mới là cách biến nó thành 04/09.

### Vận hành (bắt buộc làm)

Bốn GitHub Actions đã có sẵn trong `.github/workflows/`:

| Workflow | Việc | Secrets cần |
| --- | --- | --- |
| `ci.yml` | Lint + typecheck + test + build trên mỗi lần push | — |
| `keep-alive.yml` | Ping mỗi ngày. Supabase free **tự pause project sau 7 ngày** không hoạt động | `APP_URL`, `CRON_SECRET` |
| `backup.yml` | `pg_dump` hàng tuần. Supabase free **không có backup tự động** | `DATABASE_URL` |
| `invoice-reminders.yml` | Nhắc hoá đơn quá hạn mỗi ngày (mỗi hoá đơn đúng một lần) | `APP_URL`, `CRON_SECRET` |

`ci.yml` không cần secret nào: `next build` chạy được trên máy không có `.env.local` vì app kiểm cấu hình lúc GỌI chứ không lúc nạp module (xem `lib/env.ts`).

Backup không phải tuỳ chọn. Mất dữ liệu người thuê là mất thật.

---

## 13. Cấu trúc

```
src/
├─ config/site.ts        ← SỬA THÔNG TIN NHÀ TRỌ Ở ĐÂY
├─ app/
│  ├─ (marketing)/       /, /rooms, /contact          — công khai
│  ├─ (auth)/            /login, /forgot-password, /reset-password
│  ├─ (admin)/admin/     dashboard, phòng, người thuê, hợp đồng, điện nước,
│  │                     hoá đơn, báo hỏng, giấy tờ, báo cáo, cài đặt
│  ├─ (tenant)/me/       phòng của tôi, hoá đơn, báo hỏng, thông báo, wifi,
│  │                     giấy tờ, liên hệ, nội quy, cá nhân
│  ├─ auth/callback/     đổi code Supabase lấy session
│  ├─ manifest.ts        web app manifest (Next phục vụ tại /manifest.webmanifest)
│  ├─ icon.png           favicon — sinh bằng `npm run icons`
│  ├─ apple-icon.png     icon màn hình chính iOS — cùng script
│  └─ api/               health, cron/keep-alive, cron/invoice-reminders
├─ features/             auth · rooms · tenants · tenancies · wifi · settings · identity
│                        meters · invoices · notifications · payments · maintenance
│                        dashboard (todo card + biểu đồ doanh thu)
│                        (mỗi domain: schema.ts + actions.ts + queries.ts + components/)
├─ components/ui/        primitive kiểu shadcn
├─ components/common/    form, page-header, empty-state, link, nav-progress,
│                        install-prompt, service-worker…
├─ components/layout/    sidebar admin, bottom-nav tenant, user-menu
├─ lib/
│  ├─ db/                repository.ts (interface) + supabase-adapter
│  ├─ auth/              dal.ts (guard) + session.ts
│  ├─ supabase/          server / client / admin / proxy
│  ├─ cccd.ts            parse mã QR trên thẻ căn cước
│  ├─ qr.ts              giải mã QR trong trình duyệt (BarcodeDetector → zxing-wasm)
│  ├─ period.ts          kỳ tính tiền (tháng) + lượng tiêu thụ + tiền từng khoản
│  ├─ email.ts           gửi email qua Resend bằng fetch, không SDK
│  └─ notify.ts          ghi notifications rồi gửi email — một chỗ duy nhất
├─ stores/               Zustand — CHỈ state giao diện
└─ proxy.ts              Next 16 gọi là proxy, trước đây là middleware

app/globals.css          design token + khối `@media print` cho bản in hoá đơn
public/sw.js             service worker — ĐỌC ghi chú bảo mật ở đầu file
assets/logo.svg          nguồn của TOÀN BỘ icon — sửa file này rồi `npm run icons`
assets/logo-mark.svg     bản không nền, dùng khi in ra giấy
scripts/generate-icons.mjs · scripts/copy-wasm.mjs
```

### Vài quyết định đáng biết

**Cột nào người thuê đọc được thì đừng đặt số tiền của chủ trọ vào đó.**
RLS lọc dòng, không lọc cột — nguyên tắc này quyết định ba bảng: `gate_credentials` tách khỏi `profiles`, `maintenance_requests` không có cột `cost`, và hai việc người thuê được làm với phiếu báo hỏng đi qua SQL function chứ không qua policy UPDATE.

**Số tài khoản chuyển từ file cấu hình sang database.**
`site.ts` vẫn đúng cho tên nhà trọ và nội quy — chúng gần như không đổi. Sai cho tài khoản nhận tiền: chủ trọ đổi ngân hàng, thêm QR MoMo, tạm tắt một tài khoản, và không việc nào trong số đó nên cần một lần build.

**Không sinh mã VietQR, mà cho tải ảnh QR lên.**
Chủ trọ đã có sẵn ảnh QR trong app ngân hàng. Chụp màn hình rồi tải lên là xong: không tra mã BIN, không phụ thuộc một chuẩn có thể đổi, và cùng chỗ đó dùng được cho cả MoMo/ZaloPay.

**In hoá đơn bằng `window.print()`, không bằng thư viện PDF.**
Một thư viện PDF là nơi thứ hai định nghĩa hoá đơn trông như thế nào, và hai nơi thì sớm muộn lệch nhau.

**Biểu đồ doanh thu dựng bằng `div`.**
Một hình duy nhất trong cả app không đáng một thư viện nặng hơn phần còn lại của trang — và thư viện biểu đồ render ở client nên hình sẽ nhấp nháy sau khi trang đã hiện.

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

**Ảnh phòng nén trong trình duyệt, không nén ở server.**
Ảnh điện thoại 3–6MB được canvas thu về ≤1600px / ~300–500KB *trước khi* rời máy người dùng. Tiết kiệm cả 1GB storage lẫn băng thông, và không cần dịch vụ resize trả phí nào. Supabase free **không có** API transform ảnh — đó là tính năng Pro. Nhớ giữ `imageOrientation: "from-image"` khi vẽ lên canvas, thiếu nó là ảnh chụp dọc hiện nằm ngang.

**Bucket ảnh phòng để public, nhưng chỉ admin ghi.**
Khách vãng lai phải xem được ảnh ở trang giới thiệu. Policy trên `storage.objects` chặn mọi thao tác ghi/xoá của người không phải admin. Lưu ý khi tự kiểm tra: API xoá của Supabase Storage trả **200 kèm mảng rỗng** khi RLS chặn — nghĩa là "đã xoá 0 file", không phải xoá thành công.

**`dangerouslyAllowLocalIP` bật theo điều kiện.**
Next.js 16 chặn tối ưu ảnh từ IP nội bộ, nên Supabase local (`127.0.0.1:54321`) làm `next/image` trả 400. `next.config.ts` chỉ bật cờ này khi host Supabase thực sự là địa chỉ nội bộ — trỏ sang cloud là tự tắt.

**Không dùng `loading.tsx`.**
Trên Next 16.2 + Turbopack, loading boundary cấp route trên một segment dynamic khiến skeleton kẹt lại, nội dung không bao giờ hiện. Trang nào cần streaming thì dùng `<Suspense>` tường minh trong page — cách này chạy đúng (xem `/admin`).

**App bắt buộc có mạng. Service worker tồn tại chỉ để app cài được.**
Chrome trên Android chỉ bắn `beforeinstallprompt` — tức là nút "Cài đặt" mới hiện — khi trang có service worker đã đăng ký kèm hàm xử lý `fetch`. Không có `sw.js` thì người thuê phải tự mò menu ⋮ của trình duyệt. Mất mạng thì trình duyệt hiện màn hình lỗi của chính nó; không có trang offline giả vờ. Cờ `experimental.useOffline` của Next cũng cố ý **không** bật: nó giữ request thất bại ở trạng thái chờ rồi tự chạy lại, mà giao diện lúc đó đứng im không phân biệt được với treo.

**Service worker KHÔNG cache trang đã đăng nhập.**
Cache dùng chung cho cả origin, không tách theo tài khoản, và đăng xuất không xoá được nó. Nhà trọ hay có cảnh mượn điện thoại nhau — A đăng nhập, đăng xuất, B đăng nhập trên cùng máy. HTML của A nằm trong cache là B đọc được số CCCD, số phòng, mật khẩu wifi của A. Chỉ tài nguyên tĩnh có hash trong tên (`/_next/static/**`, `/icons/**`, `.wasm`) được cache.

**`import Link from "next/link"` đã được thay bằng `@/components/common/link`.**
Bản bọc thêm một component con vô hình gọi `useLinkStatus()`, nhờ đó thanh tiến trình ở đầu màn hình biết lúc nào đang chờ chuyển trang. Component đó render ra `null` — không thêm thẻ DOM nào, nên `<Link>` nằm trong `asChild` của Button hay trong flex có `gap` đều không bị lệch.

**Thanh tiến trình chỉ hiện khi điều hướng thật sự phải chờ.**
`useLinkStatus` không báo pending với route đã prefetch xong. Thêm hiệu ứng vào thao tác vốn đã tức thì chỉ làm nó *có cảm giác* chậm đi.

**Ảnh CCCD ở bucket private, ảnh phòng ở bucket public.**
Cố ý khác nhau. Ảnh phòng là quảng cáo, khách vãng lai phải xem được. Ảnh giấy tờ tuỳ thân là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023 — chỉ mở được bằng URL ký hạn 2 phút, và mỗi lần mở đều ghi vào `id_document_access_log`.

**Duyệt CCCD đi qua SQL function, không qua hai câu UPDATE.**
`approve_id_document()` đổi trạng thái hồ sơ *và* chép số sang `profiles` trong một giao dịch. Tách làm hai thì hồ sơ ghi "đã duyệt" mà `profiles.id_number` vẫn rỗng là trạng thái không ai phát hiện ra cho tới lúc công an kiểm tra tạm trú.

---

## 14. Lệnh

```bash
npm run dev        # dev server (Turbopack)
npm run build      # build production
npm start          # chạy bản build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest — code thuần trong src/lib
npm run test:watch # vitest ở chế độ theo dõi
npm run icons      # sinh lại bộ icon PWA từ assets/logo.svg
```

Test chỉ chạy cho `src/lib` — tính tiền, kỳ, định dạng ngày, parse mã QR CCCD. Cố ý không dựng jsdom và không test component: nhà trọ mười phòng, thứ đáng test là những hàm mà sai một chỗ thì người thuê bị tính sai tiền, không phải việc một cái thẻ có đúng class Tailwind hay không.

---

## 15. Chưa làm (Phase sau)

Thông báo đẩy iOS/Android · SMS · lưu ảnh hợp đồng · tính tiền phòng theo ngày (prorate tháng đầu/tháng cuối) · xuất hoá đơn ra CSV cho kế toán.

Đã làm xong ở phase này:

- **Nhận tiền tự quản lý** — số tài khoản và ảnh QR thêm/sửa qua giao diện (mục 7).
- **Báo hỏng** — người thuê gửi, chủ trọ xử lý, cả hai đóng được (mục 8).
- **Kết toán tiền cọc** lúc trả phòng, kèm cảnh báo hoá đơn chưa thu (mục 9).
- **Báo cáo doanh thu** theo tháng và theo phòng (mục 10).
- **"Cần xử lý"** trên trang tổng quan + huy hiệu số trên sidebar (mục 11).
- **In hoá đơn / lưu PDF** từ chính trình duyệt (mục 7).
- **Ảnh đính kèm báo hỏng** — bucket riêng tư, URL ký hạn ngắn, chặn kích thước ở bốn tầng (mục 8).

Nợ kỹ thuật đã trả trong phase này:

| Việc | Đã làm gì |
| --- | --- |
| **Múi giờ** | Hiển thị bám `houseConfig.timeZone` qua `Intl.DateTimeFormat`, không đọc TZ máy chủ. Không cần biến môi trường. Test chạy ở `TZ=UTC` để chứng minh (mục 12). |
| **`formatDuration` sai** | Thuê **tròn một năm** hiện ra "11 tháng" — cách cũ chia cho 30,44 ngày/tháng. Giờ đếm tháng theo lịch. Bug này do chính bộ test mới bắt được. |
| **Lập hoá đơn cả nhà trọ** | Lỗi ở một phòng không còn dừng cả mẻ và báo sai; ghi tên phòng lỗi rồi đi tiếp, báo hết ở cuối. Đọc chỉ số 1 lần thay vì N lần. |
| **Security header** | `frame-ancestors 'none'` + `X-Frame-Options` (chống clickjack nút Duyệt CCCD), `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`. |
| **CRON_SECRET** | So sánh thời-gian-không-đổi bằng `timingSafeEqual`, gom vào `lib/cron-auth.ts` cho cả hai endpoint. |
| **CI** | `.github/workflows/ci.yml` — lint + typecheck + test + build trên mỗi push. |
| **Test** | Vitest cho `lib/format.ts`, `lib/period.ts`, `lib/cccd.ts` — 52 test. |

Đã **bỏ khỏi kế hoạch**: chat (xem mục 7). Mã mở cổng/vân tay không thành tính năng cho người thuê — chỉ là ghi chép nội bộ của chủ trọ. Sinh mã VietQR — thay bằng tải ảnh QR lên (mục 7).

**Chưa có CSP đầy đủ.** Header hiện chỉ khai `frame-ancestors`. Một CSP đúng cần nonce sinh theo từng request trong `proxy.ts` vì Next chèn script inline cho streaming; một CSP tĩnh kèm `'unsafe-inline'` chỉ để trang trí.

Bật/tắt trang giới thiệu công khai ở `houseConfig.features` trong `src/config/site.ts`.
