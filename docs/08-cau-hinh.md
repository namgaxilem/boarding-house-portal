[← Mục lục](README.md)

# 08 — Cấu hình

## Biến môi trường

Khai báo đầy đủ kèm chú thích ở [`.env.example`](../.env.example). Bảng dưới liệt kê **biến nào
được code đọc ở đâu**.

### Bắt buộc

| Biến | Đọc ở | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/env.ts:10`, `next.config.ts:9`, `scripts/create-admin.mjs:34` | Đọc **cả lúc đọc config**: quyết định `images.remotePatterns` và `dangerouslyAllowLocalIP`. Đổi biến này phải **restart dev server**, không thì ảnh trả 400 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/env.ts:11` | Thiếu → `assertSupabaseConfigured()` ném lỗi ở request đầu tiên |

### Bắt buộc theo tính năng

| Biến | Đọc ở | Cần khi |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/env.ts:68`, `scripts/create-admin.mjs:35` | Tạo / đặt lại mật khẩu / xoá tài khoản người thuê, dọn ảnh giấy tờ, chạy `create-admin`. `getServiceRoleKey()` chỉ ném lỗi **khi được gọi** |

### Tuỳ chọn

| Biến | Đọc ở | Thiếu thì sao |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `lib/env.ts:12` | Rơi về `http://localhost:3000`. Dùng cho link trong email và redirect URI của Zalo |
| `CRON_SECRET` | `lib/cron-auth.ts:41` | `/api/cron/*` trả **503** (fail-closed) |
| `RESEND_API_KEY` | `lib/env.ts:15` | Cùng `EMAIL_FROM` quyết định `isEmailConfigured` |
| `EMAIL_FROM` | `lib/env.ts:17` | Thiếu **một trong hai** → thông báo chỉ nằm in-app |
| `TTLOCK_CLIENT_ID` / `_SECRET` / `TTLOCK_USERNAME` / `_PASSWORD` | `lib/env.ts:43-46` | Phải đủ **cả bốn** thì `isTTLockConfigured()` mới true. Thiếu → `/admin/gate` hiện checklist |
| `ZALO_APP_ID` / `ZALO_APP_SECRET` | `lib/auth/zalo.ts:38-39` | `/auth/zalo` redirect `/login?error=…` |

### Khai trong `.env.example` nhưng app không đọc

| Biến | Ai dùng |
|---|---|
| `TTLOCK_API_BASE` | **Không ai.** Chỗ trống cho tầng HTTP chưa viết |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` | CLI Supabase (`link`, `db push`, `config push`) và `.mcp.json` |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET`, `…FACEBOOK…` | `supabase/config.toml:433+` qua `env(...)`. ⚠️ CLI đọc từ **`.env`, không phải `.env.local`** |

### Không có env schema

Không `env.mjs`, không `@t3-oss/env-nextjs`. `src/lib/env.ts` là object viết tay + hàm guard,
**cố ý kiểm tra lúc gọi chứ không lúc nạp module** để `next build` chạy được trên máy không có
`.env.local`. CI dựa đúng vào điều này.

## `next.config.ts` (162)

### Cache Components

```ts
cacheComponents: true,      // dữ liệu dynamic mặc định; cache thì đánh dấu `use cache`
partialPrefetching: true,   // prefetch App Shell chung cho mỗi route
```

Bật `cacheComponents` cũng bật Partial Prerendering, kiểm tra Instant Navigation và
React `<Activity>` giữ state khi điều hướng.

`partialPrefetching` **yêu cầu** `cacheComponents` — bỏ một cái mà giữ cái kia thì `next build`
lỗi ngay ở bước đọc config, trước khi biên dịch.

`experimental.useOffline` **cố ý tắt**: cờ đó giữ request thất bại ở trạng thái chờ rồi tự chạy
lại, khiến giao diện đứng im không phân biệt được với treo, và người dùng không có cách huỷ.

### Ảnh

`remotePatterns` **suy ra từ `NEXT_PUBLIC_SUPABASE_URL`** thay vì viết cứng, để local
(`127.0.0.1:54321`) và cloud (`<ref>.supabase.co`) đều chạy mà không phải sửa file.

```ts
deviceSizes: [640, 828, 1080, 1600],
imageSizes:  [64, 128, 220, 256, 384],
```

Mặc định của Next là 8 + 7 = 15 biến thể cho **một** tấm ảnh; mỗi biến thể lần đầu bị yêu cầu
là một lần tải nguyên ảnh gốc từ Supabase về xử lý. Gói free chỉ có 5GB băng thông/tháng, và
ảnh ở đây không bao giờ vượt 1600px (`lib/image.ts` thu về mức đó trước khi tải lên) — nên 2048
và 3840 chỉ tổ phóng to một tấm ảnh vốn không có thêm chi tiết nào.

```ts
dangerouslyAllowLocalIP: supabase ? isLocalHostname(supabase.hostname) : false,
```

Next 16 chặn tối ưu ảnh từ IP nội bộ (thay đổi phá vỡ tương thích). Supabase local là
`127.0.0.1:54321` nên sẽ bị chặn. Cờ chỉ mở khi host **thực sự** là địa chỉ nội bộ — trỏ sang
cloud là nó tự tắt, không có cách nào quên.

**Không đặt `minimumCacheTTL`** — xem [04-tang-du-lieu.md](04-tang-du-lieu.md#đường-dẫn-file-là-uuid-và-điều-đó-có-chủ-ý).

### Server Actions

```ts
experimental: { serverActions: { bodySizeLimit: "12mb" } }
```

Ảnh đã nén xuống ~300–500KB trong trình duyệt, nhưng cho chọn nhiều ảnh một lần nên phải nới
mức mặc định 1MB.

### Header bảo mật

Cho **mọi** trang:

| Header | Giá trị | Vì sao |
|---|---|---|
| `X-Frame-Options` | `DENY` | Chống clickjacking — nhúng `/admin/identity` vào iframe trong suốt rồi lừa chủ trọ bấm "Duyệt" |
| `Content-Security-Policy` | `frame-ancestors 'none'` | Bản hiện đại của header trên |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Không rò đường dẫn kèm id phòng / id hồ sơ sang host khác |
| `X-Content-Type-Options` | `nosniff` | Ảnh người dùng tải lên bị đoán thành HTML là một lỗ XSS lưu trữ |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=(), payment=(), usb=()` | Giữ camera cho trang quét CCCD, đóng hết phần còn lại |

**Không có CSP đầy đủ, và đó là chủ ý.** Next chèn script inline cho streaming và hydrate, nên
một CSP đúng cần nonce sinh theo từng request — việc đó phải làm trong `proxy.ts`, không phải
trong một header tĩnh. CSP tĩnh kèm `'unsafe-inline'` chỉ để trang trí.

Header theo đường dẫn riêng:

| Đường dẫn | `Cache-Control` | Vì sao |
|---|---|---|
| `/sw.js` | `no-cache, no-store, must-revalidate` | Trình duyệt cache `sw.js` một ngày thì bản vá cũng nằm chờ một ngày |
| `/zxing_reader.wasm` | `public, max-age=31536000, immutable` | Nội dung không đổi trong một phiên bản `zxing-wasm` |

## `tsconfig.json` (34)

```jsonc
{
  "strict": true,
  "moduleResolution": "bundler",
  "noEmit": true,
  "incremental": true,
  "plugins": [{ "name": "next" }],
  "paths": { "@/*": ["./src/*"] },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts",
              ".next/dev/types/**/*.ts", "**/*.mts"],
  "exclude": ["node_modules"]
}
```

Alias `@/` trỏ `src/` — dùng ở khắp nơi, và `vitest.config.ts` khai lại cùng alias.

> 🔴 **`include` quá rộng, và nó đang làm hỏng build.** `"**/*.ts"` + `exclude` chỉ có
> `node_modules` kéo cả `supabase/.temp/**` lẫn **`.next/dev/types/**`** vào chương trình TS.
> Hệ quả: chạy `next dev` xong rồi `next build` thì build type-check luôn bản validator cũ của
> dev và hỏng. Cộng thêm: CI chạy `tsc --noEmit` trên clone sạch chưa có `.next/` nên không tìm
> thấy `PageProps`. Cả hai sửa bằng `next typegen` + siết `include` —
> xem [10-ra-soat-cau-truc.md](10-ra-soat-cau-truc.md#411).

## `eslint.config.mjs` (22)

Flat config. `eslint-config-next/core-web-vitals` + `/typescript`, **không tắt rule nào**.
Chỉ khai lại `globalIgnores` để thêm `supabase/.temp/**` và `supabase/.branches/**` — file
rác CLI Supabase ghi ra khi stack local chạy.

## `postcss.config.mjs` (7)

Đúng một plugin: `@tailwindcss/postcss`. Tailwind v4 nên **không có `tailwind.config.ts`** —
theme sống trong `src/app/globals.css`.

## `vitest.config.ts` (26)

```ts
test: {
  environment: "node",
  include: ["src/lib/**/*.test.ts"],
  env: { TZ: "UTC" },
},
resolve: { alias: { "@": "<rootDir>/src" } },
```

Xem [07-quy-uoc.md](07-quy-uoc.md#test).

## PWA

| Mảnh | File | Việc |
|---|---|---|
| Manifest | `src/app/manifest.ts` (68) | Sinh `/manifest.webmanifest` từ `houseConfig` |
| Icon | `public/icons/` (4 PNG) | `npm run icons` sinh từ `assets/logo*.svg` bằng sharp |
| Service worker | `public/sw.js` (114) | Chỉ tồn tại để app **cài được**, không để chạy offline |
| Đăng ký | `components/common/service-worker.tsx` (54) | Đăng ký `/sw.js?v=SW_VERSION`, chỉ ở production |
| Nhắc cài | `components/common/install-prompt.tsx` (189) | Bắt `beforeinstallprompt` |

### Hai điều bắt buộc biết về `sw.js`

**1. Không bao giờ cache HTML của trang đã đăng nhập.** Cache service worker dùng chung cho cả
origin, không tách theo tài khoản. Nhà trọ hay có cảnh mượn điện thoại nhau: A đăng nhập, đăng
xuất, B đăng nhập trên cùng máy — nếu HTML của A nằm trong cache thì B mở ra thấy số CCCD, số
phòng, mật khẩu wifi của A. Đăng xuất **không** xoá được cache.

Vì vậy request điều hướng đi thẳng ra mạng. Chỉ ba nhóm đường dẫn được cache:

```js
url.pathname.startsWith("/_next/static/") ||
url.pathname.startsWith("/icons/") ||
url.pathname.endsWith(".wasm")
```

**2. Sửa `sw.js` thì phải tăng `SW_VERSION`.** Không tăng thì trình duyệt vẫn chạy bản cũ đã
cache. Con số này hiện nằm ở **hai** file phải giữ khớp tay: `public/sw.js:34` và
`components/common/service-worker.tsx:16` (dùng làm query string khi đăng ký để ép tải lại).

Lý do service worker tồn tại dù app yêu cầu có mạng: Chrome trên Android chỉ bắn
`beforeinstallprompt` khi trang có service worker **đã đăng ký và có hàm xử lý `fetch`**. Không
có nó thì nút "Cài đặt" không bao giờ hiện, người thuê phải tự mò menu ⋮ của trình duyệt.

Tiếp: [09 — Chạy & triển khai](09-chay-va-trien-khai.md)
