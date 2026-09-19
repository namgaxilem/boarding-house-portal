[← Mục lục](README.md)

# 09 — Chạy & triển khai

Hướng dẫn cài đặt đầy đủ (tạo project Supabase, cấu hình Google/Facebook/Zalo, MCP, backup)
nằm ở [`../README.md`](../README.md). Trang này chỉ mô tả **cấu trúc** của việc chạy và build.

## Yêu cầu

| Thứ | Phiên bản |
|---|---|
| Node | ≥ 20.9.0 |
| Package manager | **npm** — `package-lock.json` là lockfile duy nhất |
| Docker | Chỉ khi chạy Supabase local |
| Supabase CLI | Đã là devDependency (`npx supabase` chạy được, không cần cài toàn cục) |

## Script trong `package.json`

| Script | Lệnh | Việc |
|---|---|---|
| `dev` | `next dev` | Turbopack là mặc định ở Next 16 |
| `build` | `next build` | Bắt lỗi cấu hình ngay ở bước đọc config |
| `start` | `next start` | Chạy bản đã build |
| `lint` | `eslint` | |
| `typecheck` | `tsc --noEmit` | |
| `test` | `vitest run` | |
| `test:watch` | `vitest` | |
| `db:start` / `db:stop` / `db:status` | `supabase start\|stop\|status` | Stack local |
| `db:reset` | `supabase db reset` | Chạy lại migration + seed từ đầu |
| `db:studio` | `supabase status -o env \| grep STUDIO` | ⚠️ `grep` không có trên PowerShell |
| `create-admin` | `node --env-file=.env.local scripts/create-admin.mjs` | Tạo chủ trọ đầu tiên |
| `icons` | `node scripts/generate-icons.mjs` | Sinh icon PWA + ảnh OG |
| `postinstall` | `node scripts/copy-wasm.mjs` | Chép `zxing_reader.wasm` sang `public/` |

## Hai chế độ chạy

### A. Supabase cloud (cấu hình hiện tại)

`.env.local` trỏ `https://<ref>.supabase.co`; project đã `link`
(`supabase/.temp/project-ref` tồn tại) và migration đã push.

```bash
npm run dev
```

Không cần Docker. Dùng dữ liệu thật.

### B. Supabase local (Docker)

```bash
cp .env.local.bak-local .env.local     # trỏ về 127.0.0.1:54321
npm run db:start                        # chạy migration + seed.sql tự động
npm run create-admin -- <email> "<password>" "<tên>"
npm run dev
```

Cổng mà `supabase/config.toml` mở:

| Dịch vụ | Cổng |
|---|---|
| API (PostgREST + Auth + Storage) | 54321 |
| Postgres | 54322 |
| Shadow DB | 54320 |
| Studio | 54323 |
| Mailpit (bắt email test) | 54324 |
| Connection pooler | 54329 |
| Analytics / Logflare | 54327 — **cố ý tắt** (`config.toml:390`), lỗi Docker socket trên Windows |

Postgres `major_version = 17` (`config.toml:42`).

### Kiểm chứng sau khi khởi động

1. `http://localhost:3000/` — trang marketing + danh sách phòng trống
2. `http://localhost:3000/api/health` — trả 200
3. `/login` → đăng nhập chủ trọ → `/admin`
4. `/admin/rooms/<id>` — **ảnh phòng có hiện không**

Bước 4 là phép thử cho `images.remotePatterns`, vốn suy ra từ `NEXT_PUBLIC_SUPABASE_URL` **lúc
đọc config**. Ảnh trả 400 nghĩa là sai biến, hoặc sửa `.env.local` mà chưa restart server.

## Tính năng tắt khi thiếu biến

Tất cả đều **fail-soft có chủ ý** — không cái nào chặn khởi động.

| Thiếu | Hậu quả |
|---|---|
| `RESEND_API_KEY` + `EMAIL_FROM` | Thông báo chỉ in-app, không gửi email |
| `TTLOCK_*` | `/admin/gate` hiện checklist thiết lập thay vì hoạt động |
| `ZALO_APP_ID` / `_SECRET` | Nút Zalo redirect `/login?error=…` |
| `CRON_SECRET` | `/api/cron/*` trả 503 (fail-**closed**, khác ba cái trên) |

## CI — `.github/workflows/`

| Workflow | Kích hoạt | Việc | Secret cần |
|---|---|---|---|
| `ci.yml` (52) | mọi push + PR + thủ công | `npm ci` → lint → typecheck → test | — (đặt giá trị Supabase giả để `next build` qua) |
| `keep-alive.yml` (20) | hằng ngày | `GET /api/cron/keep-alive` để project free không tự ngủ | `CRON_SECRET`, `APP_URL` |
| `invoice-reminders.yml` (24) | hằng ngày | `GET /api/cron/invoice-reminders` | `CRON_SECRET`, `APP_URL` |
| `backup.yml` (36) | hằng tuần | `pg_dump` → artifact, giữ 90 ngày | `DATABASE_URL` |

`ci.yml` dùng `concurrency` với `cancel-in-progress: true` — push liên tiếp lên cùng nhánh thì
chỉ chạy lần cuối.

> 🔴 **Bước Typecheck của CI đang hỏng.** Thứ tự là lint → typecheck → test → build, nhưng trên
> bản clone sạch chưa có `.next/` thì `PageProps` / `LayoutProps` chưa được sinh ra, nên
> `tsc --noEmit` đổ 12 lỗi `TS2304: Cannot find name 'PageProps'` trước khi tới bước build.
> Máy lập trình viên không thấy vì `.next/` còn sót từ lần `next dev` trước. Sửa bằng
> `"typecheck": "next typegen && tsc --noEmit"` — xem
> [10 §4.11](10-ra-soat-cau-truc.md#411).

**Cron chạy từ ngoài, không có bộ lập lịch trong tiến trình.** Không có `vercel.json`. Đổi lịch
= sửa `cron:` trong workflow.

## Triển khai

Không có file cấu hình nền tảng nào trong repo (không `vercel.json`, không `Dockerfile`,
không adapter). Quy trình hiện tại theo `README.md` §3:

```bash
npx supabase link --project-ref <ref>
npx supabase db push --linked --include-seed
npx supabase config push                        # đẩy cấu hình Auth/provider
```

Bucket được tạo **bên trong migration**, nên `db push` cũng là bước cấp phát storage.

Sau đó điền biến môi trường trên nền tảng host và `npm run build && npm run start`.

## Tài nguyên sinh ra (không commit)

| File | Sinh bởi | Ghi chú |
|---|---|---|
| `public/zxing_reader.wasm` | `postinstall` | ~1MB, chép từ `node_modules/zxing-wasm` |
| `next-env.d.ts` | `next dev` | |
| `tsconfig.tsbuildinfo` | `tsc --incremental` | ~270KB |
| `.next/` | `next dev` / `next build` | |
| `AGENTS.md` | `next dev` | Tự ghi lại; **có** commit — xem `node_modules/next/dist/server/lib/generate-agent-files.js` |

Icon trong `public/icons/` **có** commit (sinh bằng `npm run icons`, nguồn là `assets/logo*.svg`).

Tiếp: [10 — Rà soát cấu trúc](10-ra-soat-cau-truc.md)
