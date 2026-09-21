[← Mục lục](README.md)

# 02 — Cây thư mục

Số trong ngoặc là số dòng. Bỏ qua `node_modules/`, `.next/`, `.git/`, `.idea/`, `.serena/`.

## Gốc repo

```
boarding-house-portal/
├─ src/                     toàn bộ code ứng dụng (208 file .ts/.tsx)
├─ docs/                    tài liệu cấu trúc — thư mục này
│  └─ routes/               một README.md mỗi route, soi đúng src/app/
├─ supabase/                config.toml + 13 migration + seed.sql
├─ scripts/                 3 script Node ESM, đều được package.json gọi
├─ public/                  favicon.ico · sw.js (114) · icons/ (4 PNG) · zxing_reader.wasm*
├─ assets/                  logo.svg · logo-mark.svg — nguồn cho generate-icons.mjs
├─ .github/workflows/       ci · backup · invoice-reminders · keep-alive
├─ .claude/
│  ├─ launch.json           cấu hình dev server dùng chung (đã commit)
│  └─ settings.local.json   quyền theo máy (gitignore)
├─ README.md (859)          tài liệu vận hành: setup, deploy, OAuth, MCP, backup
├─ AGENTS.md (9)            khối quy tắc cho AI agent — do `next dev` tự sinh lại
├─ CLAUDE.md (1)            chỉ một dòng: @AGENTS.md
├─ PJ_STRUCTURE.md          báo cáo rà soát (bản gộp; chi tiết ở docs/10)
├─ .env.example (7.4K)      template biến môi trường, chú thích đầy đủ
├─ .env.local*              cấu hình thật (gitignore)
├─ next.config.ts (162)
├─ tsconfig.json (34) · eslint.config.mjs (22) · postcss.config.mjs (7) · vitest.config.ts (26)
├─ .mcp.json (17)           Supabase MCP, chế độ --read-only
└─ package.json · package-lock.json

* zxing_reader.wasm sinh ra bởi `postinstall`, không commit.
```

## `src/app/` — chỉ chứa route

```
src/app/
├─ layout.tsx (88)          layout gốc: font, ThemeProvider, Toaster, ServiceWorker
├─ error.tsx (47)           error boundary toàn cục
├─ not-found.tsx (31)       404
├─ manifest.ts (68)         → /manifest.webmanifest (PWA)
├─ sitemap.ts (30)          → /sitemap.xml — 3 URL công khai
├─ robots.ts (35)           → /robots.txt — chặn /admin /me /api /auth, trỏ sitemap
├─ globals.css (364)        Tailwind v4 @theme + token màu sáng/tối
├─ icon.png · apple-icon.png · opengraph-image.png      (file-convention metadata)
│
├─ (marketing)/             ─── công khai ───────────────────────────────
│  ├─ layout.tsx (60)
│  ├─ page.tsx (192)               /
│  ├─ rooms/page.tsx (175)         /rooms
│  └─ contact/page.tsx (156)       /contact
│
├─ (auth)/                  ─── chưa đăng nhập ──────────────────────────
│  ├─ layout.tsx (20)
│  ├─ login/page.tsx (59)
│  ├─ forgot-password/page.tsx (32)
│  └─ reset-password/page.tsx (30)
│
├─ (admin)/                 ─── chủ trọ (requireAdmin trong layout) ─────
│  ├─ layout.tsx (64)
│  └─ admin/
│     ├─ page.tsx (238)                    /admin — tổng quan
│     ├─ gate/page.tsx (253)               cổng thông minh
│     ├─ identity/page.tsx (137)           duyệt giấy tờ CCCD
│     ├─ meters/page.tsx (81)              ghi chỉ số điện nước
│     ├─ reports/page.tsx (281)            báo cáo doanh thu
│     ├─ invoices/  page (198) · new (119) · [invoiceId]/page (271) · edit (59)
│     ├─ maintenance/ page (123) · new (45) · [requestId]/page (233) · edit (63)
│     ├─ rooms/     page (83)  · new (26)  · [roomId]/page (305)    · edit (54)
│     ├─ tenants/   page (181) · new (26)  · [tenantId]/page (345)  · edit (56)
│     ├─ tenancies/ new (98) · [tenancyId]/checkout (95)      ← không có trang index
│     └─ settings/
│        ├─ layout.tsx (18)        layout lồng, dựng thanh tab
│        ├─ page.tsx (179)         thông tin nhà trọ (chỉ đọc)
│        ├─ account/page.tsx (71)
│        ├─ payments/page.tsx (34)
│        └─ wifi/page.tsx (37)
│
├─ (tenant)/                ─── người thuê ──────────────────────────────
│  ├─ layout.tsx (49)
│  └─ me/
│     ├─ page.tsx (200)                    /me
│     ├─ room/page.tsx (204)               phòng của tôi
│     ├─ profile/page.tsx (150)
│     ├─ identity/page.tsx (159)           nộp CCCD
│     ├─ contact/page.tsx (142)
│     ├─ wifi/page.tsx (91) · rules/page.tsx (46) · notifications/page.tsx (41)
│     ├─ invoices/  page (103) · [invoiceId]/page (74)
│     └─ maintenance/ page (85) · new (53) · [requestId]/page (166) · edit (58)
│
├─ api/
│  ├─ health/route.ts (24)                      GET, công khai
│  └─ cron/
│     ├─ invoice-reminders/route.ts (43)        GET, chặn bằng CRON_SECRET
│     └─ keep-alive/route.ts (20)               GET, chặn bằng CRON_SECRET
│
└─ auth/
   ├─ callback/route.ts (60)                    Supabase OAuth/PKCE
   └─ zalo/route.ts (78) · zalo/callback/route.ts (146)
```

**Không có** `loading.tsx`, `template.tsx`, `default.tsx`, `global-error.tsx`, parallel route
(`@slot`), intercepting route (`(.)`) hay catch-all (`[...x]`) nào. Skeleton được đặt trực tiếp
trong Suspense boundary của từng route file — xem [03-dinh-tuyen.md](03-dinh-tuyen.md#skeleton-và-suspense).

## `src/features/` — 15 slice

```
src/features/<slice>/
├─ actions.ts       "use server"  — ghi dữ liệu, trả ActionResult
├─ queries.ts       "server-only" — đọc dữ liệu, gọi guard trước
├─ schema.ts        Zod schema cho form của slice
└─ components/      component riêng của slice (client hoặc server)
```

| Slice | Dòng | Có gì | Thiếu gì |
|---|---|---|---|
| `invoices` | 1297 | actions (328) · queries (89) · schema (94) · 6 component | — |
| `rooms` | 1260 | actions (146) · photo-actions (105) · queries (14) · schema (70) · 6 component | — |
| `identity` | 1067 | actions (146) · queries (29) · schema (74) · id-scanner (483) · qr-camera (191) · … | — |
| `maintenance` | 1055 | actions (365) · queries (30) · schema (71) · 4 component | — |
| `payments` | 866 | actions (156) · queries (51) · schema (65) · payment-manager (462) · payment-methods (132) | — |
| `auth` | 666 | actions (202) · oauth-actions (64) · schema (63) · 4 component | không có `queries.ts` |
| `tenants` | 662 | actions (207) · queries (29) · schema (90) · 4 component | — |
| `tenancies` | 615 | actions (109) · schema (74) · check-in-form (178) · check-out-form (254) | không có `queries.ts` |
| `wifi` | 334 | actions (67) · schema (39) · wifi-manager (228) | query nằm ở `tenants/queries.ts` (`getMyWifi`) |
| `meters` | 333 | actions (65) · queries (49) · schema (58) · meter-row-form (161) | — |
| `dashboard` | 317 | queries (84) · revenue-chart (75) · todo-card (158) | chỉ đọc, không có action |
| `notifications` | 251 | actions (43) · queries (22) · 2 component | — |
| `settings` | 150 | settings-tabs (49) · storage-usage (101) | chỉ component |
| `gate` | 25 | queries (25) | chưa hoàn chỉnh — xem [10](10-ra-soat-cau-truc.md#42) |

## `src/lib/` — logic dùng chung

```
src/lib/
├─ db/
│  ├─ repository.ts (586)          interface Repository: 122 method + 20 type *Input
│  ├─ supabase-adapter.ts (3234)   implementation Supabase  ⚠ file lớn nhất repo
│  ├─ index.ts (35)                export `db`, nối adapter — một dòng duy nhất
│  └─ public-rooms.ts (17)         listVacantRooms() có cache, cho trang marketing
├─ supabase/
│  ├─ client.ts (8)                createBrowserClient — hiện KHÔNG ai dùng
│  ├─ server.ts (34)               createServerClient gắn cookie (đường chính)
│  ├─ proxy.ts (38)                updateSupabaseSession() cho src/proxy.ts
│  └─ admin.ts (21)                service-role client, "server-only"
├─ auth/
│  ├─ dal.ts (85)                  getCurrentUser / requireUser / requireAdmin
│  └─ zalo.ts (171)                OAuth Zalo tự viết (Supabase không hỗ trợ sẵn)
│
├─ action-result.ts (115)          ActionResult, ok/fail/invalid, describeError
├─ constants.ts (206)              nhãn + class Tailwind cho mọi enum, HOME_PATH
├─ env.ts (75)                     env object + assertSupabaseConfigured, getServiceRoleKey
├─ seo.ts (148)                    pageMeta() + metadataBase/absoluteUrl + robots indexable/noIndex
├─ structured-data.ts (206)        JSON-LD schema.org: LodgingBusiness, ItemList phòng, BreadcrumbList
├─ format.ts (216)  + .test.ts     formatVND, formatDate, todayInHouseTz… theo houseConfig.timeZone
├─ period.ts (94)   + .test.ts     kỳ tính tiền: toPeriod, currentPeriod, electricUsed, lineAmount
├─ cccd.ts (136)    + .test.ts     parse mã QR trên thẻ CCCD gắn chip
├─ gate.ts (417)    + .test.ts     logic thuần cho cổng TTLock  ⚠ chưa được nối vào app
├─ image.ts (155)   + .test.ts     thu nhỏ + mã hoá ảnh phía trình duyệt (encodeLadder)
├─ qr.ts (131)                     giải mã QR: BarcodeDetector → zxing-wasm
├─ upload-policy.ts (151)          mọi hạn mức tải ảnh; client + server cùng đọc
├─ email.ts (123)                  "server-only", gửi qua Resend, absoluteUrl
├─ notify.ts (329)                 "server-only", dựng thông báo (DB row + email)
├─ cron-auth.ts (56)               "server-only", so CRON_SECRET kiểu timing-safe
└─ utils.ts (6)                    cn() — clsx + tailwind-merge
```

## `src/components/` — 37 file

```
src/components/
├─ ui/          18 wrapper Radix kiểu shadcn
│               alert(42) avatar(51) badge(44) button(62) card(80) dialog(108)
│               dropdown-menu(89) input(26) label(25) select(141) separator(23)*
│               sheet(76) skeleton(13) switch(33) table(62) tabs(51)* textarea(23)
├─ common/      17 component dùng chung
│               form(123) — Field, SubmitButton, FormMessage, fieldErrorsOf
│               confirm-form(81) copy-button(86) empty-state(39) install-prompt(189)
│               json-ld(26) — thẻ <script type="application/ld+json">, có escape
│               landlord-contact(103) link(63) logo(102) nav-progress(58)
│               no-room-notice(27) page-header(67) period-picker(67)
│               service-worker(54) stat-card(65) status-badge(97) theme(39)
└─ layout/      nav-items.ts(93) admin-nav(134) marketing-auth(50)
                tenant-nav(51) user-menu(76)

* separator.tsx và tabs.tsx hiện không ai import — xem docs/10 mục 4.4.
```

## Phần còn lại của `src/`

```
src/types/index.ts (659)     barrel toàn bộ type domain — 56 interface/type
src/config/site.ts (223)     houseConfig: nguồn sự thật duy nhất về nhà trọ
src/stores/
├─ room-filter-store.ts (29) bộ lọc danh sách phòng của admin
└─ ui-store.ts (54)          UI state thuần client (cố ý không giữ dữ liệu domain)
src/proxy.ts (84)            Proxy của Next 16 (tên cũ: middleware)
```

## `supabase/`

```
supabase/
├─ config.toml (447)     cấu hình CLI. project_id, port, Auth provider, storage limit
├─ seed.sql (82)         11 phòng thật + wifi. Chạy sau migration
└─ migrations/           2.233 dòng, 12 file — thứ tự là thứ tự áp dụng
   ├─ 20260804000001_schema.sql (185)                       bảng lõi
   ├─ 20260804000002_rls.sql (161)                          Row Level Security
   ├─ 20260804000003_grants.sql (64)                        GRANT + bề mặt API công khai
   ├─ 20260804000004_identity.sql (105)                     CCCD, ràng buộc duy nhất, liên kết Zalo
   ├─ 20260804000005_room_photos.sql (75)                   ảnh phòng (bucket công khai)
   ├─ 20260810000006_id_documents.sql (276)                 luồng nộp/duyệt giấy tờ
   ├─ 20260817000007_meters_invoices_notifications.sql (301)
   ├─ 20260827000008_payments_maintenance_settlement.sql (370)
   ├─ 20260827000009_maintenance_photos.sql (164)
   ├─ 20260904000010_ttlock_gate.sql (379)                  cổng TTLock
   ├─ 20260906000011_storage_budget.sql (113)               hạn mức dung lượng
   └─ 20260906000012_room_natural_order.sql (40)            sắp phòng theo số tự nhiên
```

## `scripts/`

| File | Dòng | Gọi bởi | Việc |
|---|---|---|---|
| `copy-wasm.mjs` | 46 | `postinstall` | Chép `zxing_reader.wasm` từ `node_modules` sang `public/` |
| `create-admin.mjs` | 74 | `npm run create-admin` | Tạo tài khoản chủ trọ đầu tiên (cần service-role key) |
| `generate-icons.mjs` | 181 | `npm run icons` | Sinh icon PWA + ảnh OG từ `assets/logo*.svg` bằng sharp |
| `import-room-photos.mjs` | 329 | `npm run import-photos` | Nạp hàng loạt ảnh phòng từ thư mục `phong_<mã>/` — nén WebP rồi đẩy lên bucket `room-photos`. Chạy lại được: `storage_path` là băm nội dung file |

Tiếp: [03 — Định tuyến & phân quyền](03-dinh-tuyen.md)
