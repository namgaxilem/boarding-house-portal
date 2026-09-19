# Cấu trúc dự án & Báo cáo rà soát

> Tài liệu mô tả cấu trúc thực tế của repo và kết quả rà soát độ "sạch".
> **Chưa có thay đổi nào được thực hiện** — đây là báo cáo, không phải changelog.
>
> Phạm vi: 256 file git-tracked, ~29.700 dòng source (bỏ `node_modules`, `.next`, `.git`).

---

## 1. Tổng quan

| Hạng mục | Giá trị |
|---|---|
| Framework | Next.js **16.3** — App Router, `cacheComponents: true`, `partialPrefetching: true` |
| React | **19.2.4** (ghim cứng, không dùng dải `^`) |
| Dữ liệu | Supabase (`@supabase/ssr`) — Postgres 17, RLS là lớp bảo mật thật |
| Giao diện | Tailwind **v4** (không có `tailwind.config`, theme nằm trong `src/app/globals.css`) + Radix primitives |
| Validation | Zod 4 |
| State client | zustand 5 (chỉ UI state, không chứa dữ liệu domain) |
| Test | vitest 3 — chỉ `src/lib/**/*.test.ts`, ép `TZ=UTC` |
| Package manager | npm (`package-lock.json` là lockfile duy nhất) |
| Node yêu cầu | ≥ 20.9.0 |

---

## 2. Cây thư mục

### 2.1 Gốc repo

```
boarding-house-portal/
├─ src/                    toàn bộ code ứng dụng
├─ supabase/               config.toml + 12 migration + seed.sql
├─ scripts/                3 script Node ESM (đều được package.json gọi)
├─ public/                 favicon, sw.js, icons/, zxing_reader.wasm (sinh ra)
├─ assets/                 logo.svg, logo-mark.svg — nguồn cho scripts/generate-icons.mjs
├─ .github/workflows/      ci, backup, invoice-reminders, keep-alive
├─ .claude/launch.json     cấu hình dev server dùng chung (đã commit)
├─ README.md               859 dòng — tài liệu vận hành chính
├─ AGENTS.md               9 dòng — khối quy tắc do `next dev` tự sinh
├─ CLAUDE.md               1 dòng: @AGENTS.md
├─ .env.example            template biến môi trường, chú thích đầy đủ
├─ next.config.ts          162 dòng
├─ tsconfig.json / eslint.config.mjs / postcss.config.mjs / vitest.config.ts
└─ .mcp.json               Supabase MCP, chế độ --read-only
```

### 2.2 `src/app/` — chỉ chứa route

```
src/app/
├─ layout.tsx · error.tsx · not-found.tsx · manifest.ts · globals.css
├─ icon.png · apple-icon.png · opengraph-image.png      (file-convention metadata)
│
├─ (marketing)/     công khai       /  ·  /rooms  ·  /contact
├─ (auth)/          chưa đăng nhập  /login  ·  /forgot-password  ·  /reset-password
├─ (admin)/admin/   chủ trọ         /admin, /gate, /identity, /meters, /reports,
│                                   invoices/*, maintenance/*, rooms/*, tenants/*,
│                                   tenancies/*, settings/* (có layout lồng)
├─ (tenant)/me/     người thuê      /me + contact, identity, notifications, profile,
│                                   room, rules, wifi, invoices/*, maintenance/*
├─ api/             health · cron/invoice-reminders · cron/keep-alive
└─ auth/            callback (Supabase PKCE) · zalo · zalo/callback
```

- 4 route group, mỗi group một `layout.tsx` riêng.
- 5 dynamic segment, tất cả `[camelCase]`: `[invoiceId]`, `[requestId]`, `[roomId]`, `[tenantId]`, `[tenancyId]`.
- Không có catch-all, parallel route hay intercepting route.
- 6 `route.ts`, tất cả chỉ export `GET`.
- **Không có `middleware.ts`** — Next 16 đã đổi tên thành `proxy`; repo dùng `src/proxy.ts`.

### 2.3 `src/features/` — 14 slice

Quy ước mỗi slice: `actions.ts` (`"use server"`), `queries.ts` (`server-only`), `schema.ts` (Zod), `components/*.tsx`.

| Slice | Dòng | Slice | Dòng |
|---|---|---|---|
| invoices | 1297 | tenants | 662 |
| rooms | 1260 | tenancies | 615 |
| identity | 1067 | wifi | 334 |
| maintenance | 1055 | meters | 333 |
| payments | 866 | dashboard | 317 |
| auth | 666 | notifications | 251 |
| — | — | settings | 150 |
| — | — | gate | 25 |

### 2.4 `src/lib/`, `src/components/`, còn lại

```
src/lib/
├─ db/          repository.ts (interface) · supabase-adapter.ts (impl) · index.ts · public-rooms.ts
├─ supabase/    client.ts (browser) · server.ts · proxy.ts · admin.ts (service role)
├─ auth/        dal.ts (requireAdmin, session cache) · zalo.ts (OAuth tự viết)
└─ *.ts         action-result · constants · env · format · period · cccd · gate · image ·
                qr · upload-policy · email · notify · cron-auth · utils
                (+ 5 file .test.ts đặt cạnh: format, period, cccd, gate, image)

src/components/
├─ ui/          18 wrapper Radix kiểu shadcn
├─ common/      16 component dùng chung (form, page-header, status-badge, copy-button, …)
└─ layout/      nav-items.ts · admin-nav · tenant-nav · user-menu

src/types/index.ts   659 dòng — barrel type domain (camelCase; map từ snake_case chỉ trong lib/db)
src/config/site.ts   223 dòng — houseConfig: nguồn sự thật duy nhất về nhà trọ
src/stores/          room-filter-store · ui-store (zustand, chỉ UI state)
src/proxy.ts          84 dòng — refresh session + chặn route lạc quan
```

### 2.5 `supabase/`

12 migration, 2.233 dòng, đánh số `20260804000001` → `20260906000012`:
schema → rls → grants → identity → room_photos → id_documents →
meters_invoices_notifications → payments_maintenance_settlement → maintenance_photos →
ttlock_gate → storage_budget → room_natural_order.

Storage bucket được tạo **bên trong migration**, không phải trong `config.toml`:
`room-photos` (public), `id-photos` (private), `payment-qr` (public), `maintenance-photos`.

---

## 3. Chạy dự án

### 3.1 Supabase cloud (cấu hình hiện tại)

`.env.local` đang trỏ `https://<ref>.supabase.co`, project đã `link`, migration đã push.

```bash
npm run dev
```

Không cần Docker. `.env.local.bak-local` là bản dự phòng trỏ về stack local.

**Kiểm chứng:**

1. `http://localhost:3000/` — trang marketing + danh sách phòng trống
2. `http://localhost:3000/api/health` — trả 200
3. `/login` → đăng nhập chủ trọ → `/admin`
4. `/admin/rooms/[roomId]` — ảnh phòng hiện đúng. Đây là phép thử cho `images.remotePatterns`
   (`next.config.ts:46`), vốn suy ra từ `NEXT_PUBLIC_SUPABASE_URL` **lúc đọc config** —
   ảnh trả 400 nghĩa là sai biến hoặc chưa restart server sau khi sửa `.env.local`.

### 3.2 Supabase local (Docker)

```bash
cp .env.local.bak-local .env.local     # trỏ về 127.0.0.1:54321
npm run db:start                        # chạy migration + seed tự động
npm run create-admin -- <email> "<password>" "<tên>"
npm run dev
```

Cổng local: API 54321 · DB 54322 · Studio 54323 · Mailpit 54324 · pooler 54329.

### 3.3 Biến môi trường

| Biến | Bắt buộc | Tác dụng |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Đọc cả lúc runtime lẫn lúc đọc `next.config.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Thiếu → `assertSupabaseConfigured()` ném lỗi ở request đầu tiên |
| `SUPABASE_SERVICE_ROLE_KEY` | ◐ | Cần cho thao tác tài khoản người thuê + script `create-admin` |
| `NEXT_PUBLIC_SITE_URL` | ○ | Mặc định `http://localhost:3000` |
| `CRON_SECRET` | ○ | Thiếu → `/api/cron/*` trả **503** (fail-closed) |
| `RESEND_API_KEY` + `EMAIL_FROM` | ○ | Thiếu cả hai → thông báo chỉ in-app |
| `TTLOCK_*` (4 biến) | ○ | Thiếu → `/admin/gate` hiện checklist thiết lập |
| `ZALO_APP_ID` / `_SECRET` | ○ | Thiếu → nút Zalo redirect `/login?error=...` |

Không có env schema (`env.mjs` / t3-env). `src/lib/env.ts` là object viết tay + hàm guard,
cố ý lazy để `next build` chạy được khi không có `.env.local`.

---

## 4. Kết quả rà soát

### 4.1 Những điểm đã đúng

- **Feature-sliced rõ ràng**: `app/` chỉ chứa route, logic nằm trong `features/`. 14 slice,
  dòng code phân bố đều, không slice nào phình bất thường.
- **Tầng dữ liệu có contract**: interface `Repository` tách khỏi implementation Supabase.
  Đổi backend không phải sửa feature.
- **Đã migrate Next 16 đầy đủ**: dùng `src/proxy.ts` thay `middleware.ts` (đã deprecated),
  không có `runtime = 'edge'` ở đâu (xung khắc với `cacheComponents`).
- **Chất lượng type**: **0** `any`, **0** `@ts-ignore`, **0** `@ts-expect-error`, **0** `@ts-nocheck`,
  **0** `TODO/FIXME/HACK`, **0** khối code bị comment ≥20 dòng. `strict: true`.
  3 `eslint-disable` đều là `@next/next/no-img-element` cho ảnh signed-URL/blob — chính đáng.
- **Quy ước tên nhất quán 100%**: file & thư mục kebab-case, dynamic segment `[camelCase]`,
  Zod `camelCaseSchema`, hằng `SCREAMING_SNAKE`. Quét không ra ngoại lệ.
- **Git sạch**: không có `.bak` / `.zip` / screenshot / build output bị commit. Working tree clean.
- **Không rò secret**: quét `eyJ…`, `sb_secret`, `sbp_`, `sk_live`, `AIza…`, `ghp_`,
  `https://<ref>.supabase.co` trên toàn bộ file tracked → 0 giá trị thật.
  `.mcp.json` dùng `${VAR}`. `git log --all --diff-filter=A -- '.env*'` chỉ ra `.env.example`.
- **CI có thật**: lint + typecheck + test chạy mọi push/PR.

### 4.2 🔴 Cao — hệ thống cổng TTLock: viết xong nhưng chưa đấu dây

Khối code chết lớn nhất repo: ~1.150 dòng TS + 379 dòng SQL không có đường chạy tới.

| Thành phần | Bằng chứng |
|---|---|
| `src/lib/gate.ts` (417 dòng) | **0 importer.** Chỉ `src/lib/gate.test.ts:15` dùng. `features/gate/queries.ts` gọi `db.listGateLocks()` / `db.listGateCredentialsToRevoke()`, không đụng file này |
| `src/lib/gate.test.ts` (353 dòng) | Test cho code không ai gọi |
| `src/types/index.ts` | 8 type không nơi nào tham chiếu: `GatePasscodeKind`, `GatePasscode`, `GatePasscodeDetail`, `GateFingerprint`, `GateFingerprintDetail`, `GateEvent`, `GateEventDetail`, `IntegrationToken` |
| `supabase/migrations/20260904000010_ttlock_gate.sql` (379 dòng) | 5 bảng tạo ra, **4 bảng không bao giờ được query**: `gate_passcodes`, `gate_fingerprints`, `gate_events`, `integration_tokens` — 0 hit trong `src/`. Chỉ `gate_locks` (1 hit) và `gate_credentials` (5 hit) được dùng |
| `src/lib/env.ts:43-46` + `.env.example:110-118` | 5 biến `TTLOCK_*` cho một tầng HTTP chưa tồn tại. Toàn bộ `fetch()` trong `src/` chỉ có ở `lib/auth/zalo.ts` (2) và `lib/email.ts` (1) — không lời gọi nào tới TTLock |

Không phải rác — là tính năng làm dở. Nhưng hiện tại nó khiến người đọc tưởng cổng đã chạy.
**Cần quyết định: hoàn thiện tầng HTTP, hay tách sang nhánh riêng.**

### 4.3 🔴 Cao — `src/lib/db/supabase-adapter.ts`: 3.234 dòng (11% toàn repo)

| Vùng | Nội dung |
|---|---|
| 1–310 | Type row PostgREST |
| 312–1036 | Mapper row→domain + helper storage/sort |
| 1048–3220 | **Một object literal duy nhất** implement `Repository`, **98 method** |
| 3221+ | `mapTenancyDetails` lạc chỗ — hai anh em `mapInvoiceDetails` / `mapMaintenanceDetails` nằm ở dòng 696/726 |

`await createClient()` lặp **91 lần** trong file.

98 method **đã tự nhóm sẵn theo domain** trong file: rooms → identity → tenants → tenancies →
wifi → meters → invoices → notifications → gate → payments → maintenance → dashboard.
Đường cắt có sẵn, không cần thiết kế lại.

Kèm theo: `repository.ts` (521 dòng) = interface 98 method + 18 type `*Input` trong một file;
`types/index.ts` (659 dòng) = 56 type trong một barrel.

### 4.4 🟠 Trung bình — code chết cấp file / dependency

| Mục | Dòng | Bằng chứng |
|---|---|---|
| `src/lib/supabase/client.ts` | 8 | **0 importer.** Export `createClient()` bọc `createBrowserClient`. Cả 91 call site `createClient()` đều resolve về `@/lib/supabase/server` — app thuần server-side |
| `src/components/ui/tabs.tsx` | 51 | 0 importer. `features/settings/components/settings-tabs.tsx` tự dựng tab bằng `Link` + `usePathname` |
| `src/components/ui/separator.tsx` | 23 | 0 importer. `DropdownMenuSeparator` trong `user-menu.tsx` đến từ `ui/dropdown-menu` |
| dep `react-hook-form` | — | 0 import trong `src/`. Form dùng `<form action={serverAction}>` + `components/common/form.tsx` |
| dep `@hookform/resolvers` | — | 0 import — chỉ tồn tại để phục vụ `react-hook-form` |
| dep `@radix-ui/react-tabs` | — | Chỉ được `ui/tabs.tsx` dùng, mà file đó cũng chết |

### 4.5 🟠 Trung bình — helper bị copy-paste

| Mục | Vị trí | Ghi chú |
|---|---|---|
| `safeNext()` | `features/auth/actions.ts:22` ↔ `features/auth/oauth-actions.ts:19` | **Đáng lo nhất.** Guard chống open-redirect cài hai lần, chữ ký khác nhau, fallback khác nhau (bản OAuth hardcode `"/me"`). Hai bản sao của một guard bảo mật = hai chỗ phải nhớ vá |
| `money(label)` | `features/invoices/schema.ts:12` ↔ `features/rooms/schema.ts:3` | Thân hàm giống hệt từng byte |
| `optionalDate` | `features/identity/schema.ts:19` ↔ `features/invoices/schema.ts:31` | Giống hệt |
| `optionalText` | `features/identity/schema.ts:11` (`(max)`) ↔ `features/tenants/schema.ts:3` (`(max, label)`) | Đã phân kỳ chữ ký |
| Pipeline upload ảnh (~50 dòng) | `features/rooms/components/photo-uploader.tsx:51-70` ↔ `features/maintenance/components/request-photos.tsx:92-111` | Copy cả comment tiếng Việt |
| `SW_VERSION = "2"` | `public/sw.js:34` ↔ `src/components/common/service-worker.tsx:16` | Hai file phải tăng tay cùng lúc; comment ở `service-worker.tsx:15` chính là lời nhắc thủ công đó |
| `TIME_ZONE` | `lib/format.ts:22` ↔ `lib/gate.ts:19` | Cùng đọc `houseConfig.timeZone` |
| Prelude `setRoomCoverPhoto` / `moveRoomPhoto` | `supabase-adapter.ts:1273-1305` ↔ `1307-1345` | ~15 dòng mở đầu giống hệt |
| `fail()` | `app/auth/zalo/callback/route.ts` che `lib/action-result.ts` | Hai định nghĩa cùng tên |
| Format tiền viết tay | `supabase-adapter.ts:1980-1981` | Dùng `.toLocaleString("vi-VN")` trong khi `lib/format.ts` đã có hàm format VND. Tầng adapter đang làm việc của tầng hiển thị |

### 4.6 🟠 Trung bình — 18 skeleton dựng tay trong file route

`app/` có 18 component `*Skeleton` khai trực tiếp trong file route, 10 cái gần như trùng nhau:

- `DetailSkeleton` ×4 — `admin/invoices/[invoiceId]`, `admin/maintenance/[requestId]`,
  `admin/rooms/[roomId]`, `admin/tenants/[tenantId]`. Khác nhau đúng vài số Tailwind.
- `ListSkeleton` ×4 — `admin/maintenance`, `me/invoices`, `me/maintenance`, `me/notifications`.
  Khác nhau đúng `length` và `height`.
- `EditSkeleton` ×2 — `admin/rooms/[roomId]/edit`, `admin/tenants/[tenantId]/edit`.

Đây cũng là lời giải cho "sao không có file `loading.tsx` nào": skeleton nằm trong Suspense
boundary ngay trong route file, hợp với `cacheComponents: true`. Không sai — nhưng mẫu này
đang được **sao chép** thay vì trích ra.

### 4.7 🟡 Thấp — symbol export mà không ai dùng

~18 symbol export ra ngoài nhưng chỉ xuất hiện đúng một lần (chính dòng khai báo):

- `clearServiceWorkerCaches` (`components/common/service-worker.tsx`) — kéo theo handler
  `CLEAR_CACHES` ở `public/sw.js:109` cũng không bao giờ chạy
- `FormState` (`lib/action-result.ts`)
- `INVOICE_STATUS_OPTIONS`, `NOTIFICATION_TYPE_LABEL`, `PAYMENT_ACCOUNT_KIND_LABEL` (`lib/constants.ts`)
- `HouseConfig` (`config/site.ts:208`)
- `listActiveMaintenanceRequests` (`features/maintenance/queries.ts:13`)
- `*FormValues` ×5 (`features/{identity,invoices,meters,rooms,tenants}/schema.ts`) — tàn dư của
  thời còn dùng react-hook-form
- 4 hằng `*_BUCKET` trong `supabase-adapter.ts`
- Các type `EncodeStep`, `ResizeResult`, `EmailMessage`, `CccdParseResult`, `ZaloCredentials`, `ZaloProfile`

Nhóm export-nhưng-chỉ-dùng-nội-bộ (nên hạ xuống private): `HouseLogo`, `Crumb`,
`normalizeVietnamesePhone`, `notifyUser`, `NavBadges`, `listActivePaymentAccounts`, `REPORT_MONTHS`.

### 4.8 🟡 Thấp — lệch giữa cấu hình, tài liệu và thực tế

| Vị trí | Vấn đề |
|---|---|
| `lib/db/repository.ts:43`, `supabase-adapter.ts:766` | Comment còn nhắc "demo store" / "demo mode" — backend đó không tồn tại. `lib/db/index.ts` chỉ nối đúng một adapter |
| `.env.example:118` | `TTLOCK_API_BASE` không dòng code nào đọc |
| `package.json` → `db:studio` | `supabase status -o env \| grep STUDIO` — `grep` không có trên PowerShell, script hỏng trên chính máy đang dùng |
| `tsconfig.json` `include` | `"**/*.ts"` + `exclude: ["node_modules"]` kéo cả `supabase/.temp/**` và `.branches/**` vào; `eslint.config.mjs` phải ignore lại riêng |
| `.env.local.bak-local` | File backup chứa secret còn sót trên đĩa (đã gitignore, chưa bao giờ commit) |
| `CLAUDE.md` | File 11 byte, nội dung đúng một dòng `@AGENTS.md` |
| `README.md` | 859 dòng / 59,5 KB một file: setup + env + deploy + MCP + runbook backup. Chưa tách `docs/` |
| Ngôn ngữ comment | Phần lớn tiếng Việt; 7 file tiếng Anh: `lib/db/index.ts`, `lib/db/repository.ts` (header), `lib/supabase/{server,admin,proxy}.ts`, `stores/room-filter-store.ts`, `app/api/cron/keep-alive/route.ts`. `src/proxy.ts` lẫn cả hai trong một doc block |

### 4.9 🟡 Thấp — file dài

| File | Dòng |
|---|---|
| `src/features/identity/components/id-scanner.tsx` | 483 |
| `src/features/payments/components/payment-manager.tsx` | 462 |

Hai file duy nhất trong `features/` vượt 450 dòng. Cả hai là client component có state phức tạp
(camera/QR, upload + sắp xếp). Chưa tới mức bắt buộc tách.

### 4.10 ⚪ Ghi nhận — không phải lỗi

- `src/config/site.ts` hardcode địa chỉ, email, số điện thoại, giá điện nước vào source.
  Đây là **chủ ý** — file tự mô tả là nguồn sự thật duy nhất cho một nhà trọ cụ thể, và dữ liệu này
  vốn công khai trên trang marketing. Không phải rò rỉ. Chỉ lưu ý: đổi giá điện = phải deploy lại.
- 4 client Supabase (`client` / `server` / `proxy` / `admin`) là chuẩn `@supabase/ssr`,
  **không phải trùng lặp** — ngoại trừ `client.ts` hiện không ai dùng (mục 4.4).
- `features/gate/` chỉ có `queries.ts`, `features/settings/` chỉ có `components/` — slice chưa
  đầy đủ vì tính năng chưa xong, không phải lỗi cấu trúc.

---

## 5. Thứ tự đề xuất khi dọn

| # | Việc | Rủi ro |
|---|---|---|
| 1 | Gộp `safeNext()` về một chỗ dùng chung | Thấp, nhưng **làm trước** vì là guard bảo mật |
| 2 | Xoá `ui/tabs.tsx`, `ui/separator.tsx`, `lib/supabase/client.ts`; `npm rm react-hook-form @hookform/resolvers @radix-ui/react-tabs` | Rất thấp |
| 3 | Xoá symbol export chết (mục 4.7) + comment "demo store" lỗi thời | Rất thấp |
| 4 | Trích `money` / `optionalText` / `optionalDate` về schema dùng chung; trích 3 skeleton dùng chung; gộp pipeline upload ảnh; đưa format tiền về `lib/format.ts` | Thấp |
| 5 | Sửa `db:studio` cho Windows; siết `tsconfig.include` về `src/**` + config gốc; bỏ `TTLOCK_API_BASE` khỏi `.env.example` | Thấp |
| 6 | **Quyết định về TTLock** (mục 4.2): hoàn thiện tầng HTTP, hay gỡ `lib/gate.ts` + test + 8 type + 4 bảng SQL sang nhánh riêng | Cần chủ dự án quyết |
| 7 | Tách `supabase-adapter.ts` → `lib/db/adapters/<domain>.ts` + `lib/db/mappers.ts`; tách `repository.ts` và `types/index.ts` theo cùng đường cắt | Cao — làm riêng một đợt, có test kèm |

---

## 6. Cách kiểm chứng sau khi sửa

```bash
npm run typecheck
npm run lint
npm run test      # vitest, chỉ src/lib/**/*.test.ts, ép TZ=UTC
npm run build     # bắt lỗi cacheComponents/partialPrefetching ngay ở bước đọc config
```

- Sau đợt gỡ code chết: mở `/admin/settings`, `/admin/settings/payments`, `/admin/settings/wifi`
  xác nhận tab điều hướng vẫn chạy sau khi xoá `ui/tabs.tsx`.
- Nếu đụng TTLock: mở `/admin/gate`.
- Khi xoá `lib/gate.ts`, `npm run test` sẽ mất 353 dòng test — đó là test của chính code bị xoá,
  không phải mất độ phủ thật.
