[← Mục lục](README.md)

# 10 — Rà soát cấu trúc

Kết quả audit toàn repo. **Chưa sửa gì** — đây là báo cáo.
Phạm vi: 256 file git-tracked, ~29.700 dòng source.

## Tóm tắt

Repo sạch hơn mức trung bình rõ rệt. Phần còn lại là một số ít vấn đề cụ thể và đo được.

> 🔴 **Ba lỗi phát hiện khi chạy thử — đọc trước:**
> [4.13 — lỗ hổng open redirect ở trang đăng nhập](#413) ·
> [4.11 — `npm run build` và CI đang hỏng](#411) ·
> [4.12 — thiếu `metadataBase`](#412).
> Cả ba đều kiểm chứng được bằng lệnh, không phải suy đoán.

<a id="41"></a>

## 4.1 Những điểm đã đúng

| Hạng mục | Kết quả |
|---|---|
| `any` (mọi dạng) | **0** |
| `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | **0** |
| `TODO` / `FIXME` / `HACK` / `XXX` | **0** |
| Khối code bị comment ≥20 dòng | **0** |
| Rule ESLint bị tắt trong config | **0** |
| Secret bị commit | **0** |
| Build output bị commit | **0** |
| File `.bak` / `.zip` / ảnh chụp màn hình bị commit | **0** |
| Tên file lệch quy ước kebab-case | **0** |

- **Kiến trúc feature-sliced** rõ ràng: `app/` chỉ chứa route, 14 slice phân bố đều (25–1297 dòng).
- **Tầng dữ liệu có contract**: interface `Repository` tách khỏi implementation.
- **Đã migrate Next 16 đầy đủ**: dùng `src/proxy.ts` thay `middleware.ts` (deprecated),
  không có `runtime = 'edge'` (xung khắc với `cacheComponents`).
- **Quét secret** (`eyJ…`, `sb_secret`, `sbp_`, `sk_live`, `AIza…`, `ghp_`,
  `https://<ref>.supabase.co`) trên toàn bộ file tracked → 0 giá trị thật.
  `git log --all --diff-filter=A -- '.env*'` chỉ ra `.env.example`.
- **CI có thật**: lint + typecheck + test mọi push/PR.

<a id="42"></a>

## 4.2 🔴 Cao — Hệ thống cổng TTLock viết xong nhưng chưa đấu dây

Khối code chết lớn nhất repo: ~1.150 dòng TypeScript + 379 dòng SQL không có đường chạy tới.

| Thành phần | Bằng chứng |
|---|---|
| `src/lib/gate.ts` (417) | **0 importer.** Chỉ `src/lib/gate.test.ts:15` dùng. `features/gate/queries.ts` gọi `db.listGateLocks()` / `db.listGateCredentialsToRevoke()`, không đụng file này |
| `src/lib/gate.test.ts` (353) | Test cho code không ai gọi |
| `src/types/index.ts` | 8 type không nơi nào tham chiếu: `GatePasscodeKind`, `GatePasscode`, `GatePasscodeDetail`, `GateFingerprint`, `GateFingerprintDetail`, `GateEvent`, `GateEventDetail`, `IntegrationToken` |
| `supabase/migrations/20260904000010_ttlock_gate.sql` (379) | 5 bảng tạo ra, **4 bảng không bao giờ được query**: `gate_passcodes`, `gate_fingerprints`, `gate_events`, `integration_tokens` — 0 hit trong `src/`. Chỉ `gate_locks` (1 hit) và `gate_credentials` (5 hit) được dùng |
| `src/lib/env.ts:43-46` + `.env.example:110-118` | 5 biến `TTLOCK_*` cho một tầng HTTP chưa tồn tại. Toàn bộ `fetch()` trong `src/` chỉ có ở `lib/auth/zalo.ts` (2) và `lib/email.ts` (1) |

Không phải rác — là **tính năng làm dở**. Nhưng hiện tại nó khiến người đọc tưởng cổng đã chạy.

**Cần quyết định:** hoàn thiện tầng HTTP TTLock, hay tách toàn bộ sang nhánh riêng.

<a id="43"></a>

## 4.3 🔴 Cao — `supabase-adapter.ts` 3.234 dòng

11% toàn bộ source nằm trong một file.

| Vùng | Nội dung |
|---|---|
| 1–310 | Type row PostgREST |
| 312–1036 | Mapper row→domain + helper storage/sắp xếp |
| 1048–3220 | **Một object literal** implement `Repository`, **98 method** |
| 3221+ | `mapTenancyDetails` lạc chỗ — hai anh em ở dòng 696/726 |

`await createClient()` lặp **91 lần** trong file.

Đường cắt đã có sẵn: 98 method tự nhóm theo domain (rooms → identity → tenants → tenancies →
wifi → meters → invoices → notifications → gate → payments → maintenance → dashboard).

Kèm theo: `repository.ts` (521) = interface 98 method + 18 type `*Input` trong một file;
`types/index.ts` (659) = 56 type trong một barrel.

<a id="44"></a>

## 4.4 🟠 Trung bình — Code chết cấp file / dependency

| Mục | Dòng | Bằng chứng |
|---|---|---|
| `src/lib/supabase/client.ts` | 8 | **0 importer.** Export `createClient()` bọc `createBrowserClient`. Cả 91 call site `createClient()` đều resolve về `@/lib/supabase/server` — app thuần server-side |
| `src/components/ui/tabs.tsx` | 51 | 0 importer. `features/settings/components/settings-tabs.tsx` tự dựng tab bằng `Link` + `usePathname` |
| `src/components/ui/separator.tsx` | 23 | 0 importer. `DropdownMenuSeparator` trong `user-menu.tsx` đến từ `ui/dropdown-menu` |
| dep `react-hook-form` | — | 0 import trong `src/`. Form dùng `<form action={serverAction}>` + `components/common/form.tsx` |
| dep `@hookform/resolvers` | — | 0 import — chỉ tồn tại để phục vụ `react-hook-form` |
| dep `@radix-ui/react-tabs` | — | Chỉ được `ui/tabs.tsx` dùng, mà file đó cũng chết |

<a id="45"></a>

## 4.5 🟠 Trung bình — Helper bị copy-paste

| Mục | Vị trí | Ghi chú |
|---|---|---|
| **`safeNext()`** | `features/auth/actions.ts:22` ↔ `features/auth/oauth-actions.ts:19` ↔ `app/auth/callback/route.ts:17` | **Ba bản, không phải hai** — và cả ba đều thủng. Xem [4.13](#413): đây không còn là vấn đề bảo trì mà là lỗ hổng thật |
| `money(label)` | `features/invoices/schema.ts:12` ↔ `features/rooms/schema.ts:3` | Thân hàm giống hệt từng byte |
| `optionalDate` | `features/identity/schema.ts:19` ↔ `features/invoices/schema.ts:31` | Giống hệt |
| `optionalText` | `features/identity/schema.ts:11` (`(max)`) ↔ `features/tenants/schema.ts:3` (`(max, label)`) | Đã phân kỳ chữ ký |
| Pipeline upload ảnh (~50 dòng) | `features/rooms/components/photo-uploader.tsx:51-70` ↔ `features/maintenance/components/request-photos.tsx:92-111` | Copy cả comment tiếng Việt |
| `SW_VERSION = "2"` | `public/sw.js:34` ↔ `src/components/common/service-worker.tsx:16` | Hai file phải tăng tay cùng lúc; comment ở `service-worker.tsx:15` chính là lời nhắc thủ công đó |
| `TIME_ZONE` | `lib/format.ts:22` ↔ `lib/gate.ts:19` | Cùng đọc `houseConfig.timeZone` |
| Prelude `setRoomCoverPhoto` / `moveRoomPhoto` | `supabase-adapter.ts:1273-1305` ↔ `1307-1345` | ~15 dòng mở đầu giống hệt |
| `fail()` | `app/auth/zalo/callback/route.ts` che `lib/action-result.ts` | Hai định nghĩa cùng tên |
| Format tiền viết tay | `supabase-adapter.ts:1980-1981` | Dùng `.toLocaleString("vi-VN")` trong khi `lib/format.ts:115` đã có `formatVND`. Tầng adapter đang làm việc của tầng hiển thị |

<a id="46"></a>

## 4.6 🟠 Trung bình — 18 skeleton dựng tay trong route file

`app/` có 18 component `*Skeleton` khai trực tiếp trong route file, 10 cái gần như trùng nhau:

- **`DetailSkeleton` ×4** — `admin/invoices/[invoiceId]:59`, `admin/maintenance/[requestId]:54`,
  `admin/rooms/[roomId]:58`, `admin/tenants/[tenantId]:56`. Khác nhau đúng vài số Tailwind.
- **`ListSkeleton` ×4** — `admin/maintenance:96`, `me/invoices:33`, `me/maintenance:34`,
  `me/notifications:28`. Khác nhau đúng `length` và `height`.
- **`EditSkeleton` ×2** — `admin/rooms/[roomId]/edit:24`, `admin/tenants/[tenantId]/edit:26`.

Còn lại là skeleton riêng: `RowsSkeleton`, `StatsSkeleton`, `ReportSkeleton`, `CheckOutSkeleton`,
`RoomGridSkeleton`, `HomeSkeleton`, `RoomSkeleton`, `WifiSkeleton`.

Đây cũng là lời giải cho "sao không có file `loading.tsx` nào": skeleton nằm trong Suspense
boundary ngay trong route file, hợp với `cacheComponents: true`. Không sai — nhưng mẫu này đang
được **sao chép** thay vì trích ra.

<a id="47"></a>

## 4.7 🟡 Thấp — Symbol export mà không ai dùng

~18 symbol export ra ngoài nhưng chỉ xuất hiện đúng một lần (chính dòng khai báo):

| Symbol | File |
|---|---|
| `clearServiceWorkerCaches` | `components/common/service-worker.tsx` — kéo theo handler `CLEAR_CACHES` ở `public/sw.js:109` cũng không bao giờ chạy |
| `FormState` | `lib/action-result.ts` |
| `INVOICE_STATUS_OPTIONS`, `NOTIFICATION_TYPE_LABEL`, `PAYMENT_ACCOUNT_KIND_LABEL` | `lib/constants.ts:98,111,178` |
| `HouseConfig` | `config/site.ts:208` |
| `listActiveMaintenanceRequests` | `features/maintenance/queries.ts:13` |
| `*FormValues` ×5 | `features/{identity,invoices,meters,rooms,tenants}/schema.ts` — tàn dư của thời còn dùng react-hook-form |
| `ROOM_PHOTO_BUCKET`, `ID_PHOTO_BUCKET`, `PAYMENT_QR_BUCKET`, `MAINTENANCE_PHOTO_BUCKET` | `lib/db/supabase-adapter.ts` |
| `EncodeStep`, `ResizeResult` | `lib/image.ts` |
| `EmailMessage` | `lib/email.ts` |
| `CccdParseResult` | `lib/cccd.ts` |
| `ZaloCredentials`, `ZaloProfile` | `lib/auth/zalo.ts` |

Nhóm export-nhưng-chỉ-dùng-nội-bộ (nên hạ xuống private): `HouseLogo` (`common/logo.tsx`),
`Crumb` (`common/page-header.tsx:6`), `normalizeVietnamesePhone` (`lib/auth/zalo.ts:164`),
`notifyUser` (`lib/notify.ts:44`), `NavBadges` (`layout/admin-nav.tsx`),
`listActivePaymentAccounts` (`features/payments/queries.ts:10`),
`REPORT_MONTHS` (`features/dashboard/queries.ts:63`).

<a id="48"></a>

## 4.8 🟡 Thấp — Lệch giữa cấu hình, tài liệu và thực tế

| Vị trí | Vấn đề |
|---|---|
| `lib/db/repository.ts:43`, `supabase-adapter.ts:766` | Comment còn nhắc "demo store" / "demo mode" — backend đó không tồn tại. `lib/db/index.ts` chỉ nối đúng một adapter |
| `.env.example:118` | `TTLOCK_API_BASE` không dòng code nào đọc |
| `package.json` → `db:studio` | `supabase status -o env \| grep STUDIO` — `grep` không có trên PowerShell, script hỏng trên chính máy đang dùng |
| `tsconfig.json` `include` | `"**/*.ts"` + `exclude: ["node_modules"]` kéo cả `supabase/.temp/**` và `.branches/**` vào; `eslint.config.mjs` phải ignore lại riêng. **Kéo cả `.next/dev/types` — xem [4.11](#411), đó là lỗi chặn đường** |
| `.env.local.bak-local` | File backup chứa secret còn sót trên đĩa (đã gitignore, chưa bao giờ commit) |
| `CLAUDE.md` | File 11 byte, nội dung đúng một dòng `@AGENTS.md` |
| `README.md` | 859 dòng / 59,5 KB một file: setup + env + deploy + MCP + runbook backup |
| Ngôn ngữ comment | Phần lớn tiếng Việt; 7 file tiếng Anh: `lib/db/index.ts`, header `lib/db/repository.ts`, `lib/supabase/{server,admin,proxy}.ts`, `stores/room-filter-store.ts`, `app/api/cron/keep-alive/route.ts`. `src/proxy.ts` lẫn cả hai trong một doc block |

<a id="49"></a>

## 4.9 🟡 Thấp — File dài

| File | Dòng |
|---|---|
| `src/features/identity/components/id-scanner.tsx` | 483 |
| `src/features/payments/components/payment-manager.tsx` | 462 |

Hai file duy nhất trong `features/` vượt 450 dòng. Cả hai là client component có state phức tạp
(camera/QR, upload + sắp xếp). Chưa tới mức bắt buộc tách.

Ngoài `features/`: `types/index.ts` (659), `repository.ts` (521), `lib/gate.ts` (417),
`README.md` (859), `supabase/config.toml` (447, do CLI sinh).

<a id="410"></a>

## 4.10 ⚪ Ghi nhận — không phải lỗi

- **`src/config/site.ts` hardcode** địa chỉ, email, số điện thoại, giá điện nước vào source.
  Đây là **chủ ý** — file tự mô tả là nguồn sự thật duy nhất cho một nhà trọ cụ thể, và dữ liệu
  này vốn công khai trên trang marketing. Không phải rò rỉ. Đánh đổi: đổi giá điện = phải deploy lại.
- **4 client Supabase** (`client` / `server` / `proxy` / `admin`) là chuẩn `@supabase/ssr`,
  **không phải trùng lặp** — ngoại trừ `client.ts` hiện không ai dùng (mục [4.4](#44)).
- **`features/gate/` chỉ có `queries.ts`**, `features/settings/` chỉ có `components/` — slice
  chưa đầy đủ vì tính năng chưa xong, không phải lỗi cấu trúc.
- **Không có `loading.tsx`** — skeleton nằm trong Suspense boundary của route file, hợp với
  `cacheComponents`. Xem mục [4.6](#46).

<a id="411"></a>

## 4.11 🔴 Cao — `npm run build` và CI đang hỏng

Hai triệu chứng, một gốc: **typed routes của Next 16 + `tsconfig.include` quá rộng.**

### Triệu chứng A — CI hỏng ở bước Typecheck

`.github/workflows/ci.yml` chạy `npm ci` → lint → **typecheck** → test → build.
Trên bản clone sạch chưa có `.next/`, các type toàn cục `PageProps` / `LayoutProps` **chưa được
sinh ra**, nên `tsc --noEmit` hỏng trước khi tới bước build.

```
$ mv .next .next-BAK && npm run typecheck
src/app/(tenant)/me/profile/page.tsx(26,46): error TS2304: Cannot find name 'PageProps'.
src/app/(auth)/login/page.tsx(18,48): error TS2304: Cannot find name 'PageProps'.
… 12 lỗi cùng loại
```

Máy lập trình viên không thấy lỗi này vì `.next/` còn sót lại từ lần `next dev` trước.

### Triệu chứng B — `next build` hỏng sau khi đã chạy `next dev`

`tsconfig.include` có **cả hai**: `.next/types/**/*.ts` (build) và `.next/dev/types/**/*.ts` (dev).
Chạy dev rồi build thì bản validator của dev còn nằm đó, mang theo một danh sách route cũ, và
`next build` type-check luôn file đó:

```
$ npm run build
.next/dev/types/validator.ts(331,52): error TS2344:
    Type '"/"' does not satisfy the constraint 'never'.
… 29 lỗi cùng loại
Failed to type check.
```

Xoá `.next/dev` rồi build lại thì **qua ngay** — đã kiểm chứng.

### Cách sửa

Next 16 có sẵn lệnh cho đúng việc này, và tài liệu của nó khuyến nghị đúng câu lệnh dưới đây
(`node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md:185`):

```jsonc
// package.json
"typecheck": "next typegen && tsc --noEmit"
```

Đã kiểm chứng từ trạng thái `.next/` rỗng hoàn toàn:

```
$ rm -rf .next && npx next typegen && npx tsc --noEmit
✓ Types generated successfully
TypeScript: No errors found
```

Cho triệu chứng B, chọn một trong hai:

- Bỏ `.next/dev/types/**/*.ts` khỏi `tsconfig.include`, hoặc
- Thêm `.next` vào `exclude` và để `next build` / `next typegen` tự nạp type của nó.

Nhân tiện siết luôn `include` về `src/**` + file config ở gốc, để `supabase/.temp/**` không còn
lọt vào (mục [4.8](#48)).

### Vì sao đáng xếp mức cao

Bước Typecheck trong CI hỏng ở **mọi** push. Một job CI luôn đỏ thì chẳng bao lâu sẽ thành job
CI không ai đọc — và lúc đó nó không còn chặn được lỗi thật nào nữa.

<a id="412"></a>

## 4.12 ✅ ĐÃ SỬA — Thiếu `metadataBase`, ảnh chia sẻ trỏ về `localhost`

> Đã sửa: `src/app/layout.tsx` khai `metadataBase` (từ `src/lib/seo.ts`), `next build`
> không còn cảnh báo. Cùng đợt đó thêm `pageMeta()`, `sitemap.ts`, `robots.ts` —
> xem README mục 5, phần "SEO: thẻ chia sẻ, sitemap, robots". Phần bên dưới giữ
> nguyên làm biên bản.

`next build` cảnh báo **ba lần**:

```
⚠ metadataBase property in metadata export is not set for resolving social open
  graph or twitter images, using "http://localhost:3000"
```

`grep -rn "metadataBase" src/` → **không có dòng nào**.

Hệ quả: `src/app/opengraph-image.png` và mọi ảnh OG/Twitter được phân giải thành URL tuyệt đối
dựa trên `http://localhost:3000`. Dán link nhà trọ vào Zalo, Messenger hay Facebook thì thẻ xem
trước **không tải được ảnh** — đúng chỗ mà một trang cho thuê phòng cần trông tử tế nhất.

Sửa ở `src/app/layout.tsx`, dùng biến vốn đã có:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),   // NEXT_PUBLIC_SITE_URL, mặc định http://localhost:3000
  …
};
```

`env.siteUrl` đã được khai ở `src/lib/env.ts:12` và đang dùng cho link trong email lẫn redirect
URI của Zalo — nên không thêm biến môi trường mới nào.

<a id="413"></a>

## 4.13 🔴 Cao — Open redirect ở trang đăng nhập

Guard chống open redirect dùng ở ba chỗ đều viết cùng một kiểu:

```ts
next.startsWith("/") && !next.startsWith("//")
```

Nó chặn `//evil.com`, nhưng **không chặn dấu gạch chéo ngược và ký tự điều khiển**. Theo chuẩn
WHATWG URL, với scheme đặc biệt (`http`/`https`) thì `\` được xử lý y hệt `/`, và tab/xuống dòng
bị loại bỏ trước khi phân giải.

### Kiểm chứng

Chạy đúng cái guard đó trên vài payload, phân giải bằng chính `URL` của Node/trình duyệt:

```
A) redirect(path) tương đối — dùng ở signIn (actions.ts:55)
  "/admin"           guard=PASS   -> http://localhost:3000/admin
  "//evil.com"       guard=block  -> http://evil.com/
  "/\evil.com"       guard=PASS   -> http://evil.com/        <<< OPEN REDIRECT
  "/\t/evil.com"     guard=PASS   -> http://evil.com/        <<< OPEN REDIRECT
  "/\n//evil.com"    guard=PASS   -> http://evil.com/        <<< OPEN REDIRECT

B) origin + path — dùng ở /auth/callback (route.ts:17)
  mọi payload        -> luôn ở lại http://localhost:3000/…   (an toàn)
```

### Chỗ khai thác được

Đúng **một** chỗ: `src/features/auth/actions.ts:55`.

```ts
redirect(safeNext(next, HOME_PATH[user.role]));   // Location tương đối
```

Đường đi của dữ liệu, không có bước nào lọc:

```
?next=  (kẻ tấn công đặt)
  → app/(auth)/login/page.tsx:28      typeof next === "string" ? next : undefined
  → components/login-form.tsx:17      <input type="hidden" name="next">
  → features/auth/schema.ts           next: z.string().optional()      ← không ràng buộc
  → features/auth/actions.ts:55       redirect(safeNext(...))
```

**Kịch bản:** gửi cho chủ trọ link `https://<nhà-trọ>/login?next=/\evil.com`. Họ thấy đúng tên
miền thật, đăng nhập thật, rồi bị đẩy sang `evil.com` — trang đó dựng lại giao diện nhà trọ và
xin nhập lại mật khẩu. Phishing mượn uy tín tên miền thật.

### Hai chỗ còn lại an toàn, nhưng vì lý do tình cờ

- `app/auth/callback/route.ts:17` — an toàn vì ghép `${origin}${destination}`, scheme và host đã
  có sẵn nên payload chỉ thành đường dẫn cùng origin.
- `features/auth/oauth-actions.ts:19` — an toàn vì kết quả đi qua `encodeURIComponent()` vào một
  query param, rồi rơi về `/auth/callback` ở trên.

Cả hai an toàn **nhờ ngữ cảnh gọi**, không nhờ bản thân guard. Sửa một chỗ mà bỏ hai chỗ kia là
để lại bẫy cho lần refactor sau.

### Cách sửa

Gom về **một** hàm dùng chung, và để `URL` tự phân giải thay vì so chuỗi:

```ts
// src/lib/safe-next.ts
export function safeNext(next: unknown, fallback: string): string {
  if (typeof next !== "string" || next === "") return fallback;
  // Phân giải trên một origin giả: mọi mẹo `\`, tab, xuống dòng đều lộ ra ở đây.
  const url = URL.parse?.(next, "http://x.invalid") ?? tryParse(next);
  if (!url || url.origin !== "http://x.invalid") return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
```

Rồi cho cả ba chỗ gọi nó. Thêm một test bảng với đúng các payload ở trên — `src/lib/` đã có sẵn
vitest, và đây chính là loại hàm thuần mà bộ test đó sinh ra để giữ.

### Ghi chú

Không phải lỗi chí mạng: nó không lấy được phiên đăng nhập, không đọc được dữ liệu. Nhưng app
này giữ **số CCCD và ảnh giấy tờ tuỳ thân**, và một trang đăng nhập đẩy người dùng sang tên miền
lạ là đúng thứ mà một chiến dịch lừa đảo cần.

---

## Thứ tự đề xuất khi dọn

| # | Việc | Rủi ro |
|---|---|---|
| 00 | **Vá open redirect, gom `safeNext` về một hàm** ([4.13](#413)) | Rất thấp — **làm trước hết**, đang khai thác được |
| 0a | **Sửa `typecheck` thành `next typegen && tsc --noEmit`** ([4.11](#411)) | Rất thấp — CI đang đỏ mọi push |
| 0b | **Bỏ `.next/dev/types` khỏi `tsconfig.include`** ([4.11](#411)) | Rất thấp — build đang hỏng sau mỗi lần chạy dev |
| 0c | **Thêm `metadataBase`** vào `src/app/layout.tsx` ([4.12](#412)) | Rất thấp — một dòng |
| 2 | Xoá `ui/tabs.tsx`, `ui/separator.tsx`, `lib/supabase/client.ts`; `npm rm react-hook-form @hookform/resolvers @radix-ui/react-tabs` | Rất thấp |
| 3 | Xoá symbol export chết (mục [4.7](#47)) + comment "demo store" lỗi thời | Rất thấp |
| 4 | Trích `money` / `optionalText` / `optionalDate` về schema dùng chung; trích 3 skeleton dùng chung; gộp pipeline upload ảnh; đưa format tiền về `lib/format.ts` | Thấp |
| 5 | Sửa `db:studio` cho Windows; siết `tsconfig.include` về `src/**` + config gốc; bỏ `TTLOCK_API_BASE` khỏi `.env.example` | Thấp |
| 6 | **Quyết định về TTLock** (mục [4.2](#42)) | Cần chủ dự án quyết |
| 7 | Tách `supabase-adapter.ts` → `lib/db/adapters/<domain>.ts` + `lib/db/mappers.ts`; tách `repository.ts` và `types/index.ts` theo cùng đường cắt | Cao — làm riêng một đợt, có test kèm |

## Cách kiểm chứng sau khi sửa

```bash
npm run typecheck
npm run lint
npm run test      # vitest, chỉ src/lib/**/*.test.ts, ép TZ=UTC
npm run build     # bắt lỗi cacheComponents/partialPrefetching ngay ở bước đọc config
```

- Sau đợt gỡ code chết: mở `/admin/settings`, `/admin/settings/payments`, `/admin/settings/wifi`
  xác nhận thanh tab vẫn chạy sau khi xoá `ui/tabs.tsx`.
- Nếu đụng TTLock: mở `/admin/gate`.
- Khi xoá `lib/gate.ts`, `npm run test` sẽ mất 353 dòng test — đó là test của chính code bị xoá,
  không phải mất độ phủ thật.

[← Mục lục](README.md)
