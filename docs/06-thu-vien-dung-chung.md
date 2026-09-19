[← Mục lục](README.md)

# 06 — Thư viện dùng chung

Mọi thứ ngoài `app/` và `features/`.

## `src/lib/` — logic thuần và tiện ích

### Trả kết quả từ Server Action — `action-result.ts` (115)

```ts
export type ActionResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type FormState<T = void> = ActionResult<T> | null;   // ⚠ hiện không ai dùng
```

| Hàm | Việc |
|---|---|
| `ok(data?)` | Trả thành công |
| `fail(error, fieldErrors?)` | Trả thất bại |
| `invalid(zodError, message?)` | Biến `ZodError` thành `fieldErrors` — dựng từ `issues`, không dùng `flatten()` (helper đó đổi chỗ giữa zod 3 và 4) |
| `describeError(error, fallback)` | Dịch mã lỗi adapter sang tiếng Việt |

`describeError` giữ một bảng ~45 mã. Vài ví dụ cho thấy giọng văn: mô tả **việc cần làm**, không
mô tả lỗi kỹ thuật.

```
ROOM_OCCUPIED             → "Phòng đang có người ở. Cho trả phòng trước khi xoá."
METER_READING_BACKWARDS   → "Chỉ số cuối kỳ nhỏ hơn đầu kỳ. Đồng hồ không chạy lùi —
                             kiểm tra lại số vừa gõ."
MAINTENANCE_LOCKED        → "Chủ trọ đã bắt đầu xử lý phiếu này nên không sửa được nữa.
                             Gửi phiếu mới nếu có thêm thông tin."
DEDUCTION_OVER_DEPOSIT    → "Số trừ vào cọc lớn hơn số cọc đang giữ. Phần người thuê còn nợ
                             vượt quá tiền cọc thì lập một hoá đơn riêng."
```

### Cấu hình môi trường — `env.ts` (75)

```ts
export const env = { supabaseUrl, supabaseAnonKey, siteUrl, resendApiKey, emailFrom };

export const isSupabaseConfigured: boolean;   // bắt buộc
export const isEmailConfigured: boolean;      // tuỳ chọn
export function isTTLockConfigured(): boolean; // tuỳ chọn, đọc lúc gọi
export function assertSupabaseConfigured(): void;  // ném lỗi nếu thiếu
export function getServiceRoleKey(): string;       // ném lỗi nếu thiếu
```

Hai quyết định đáng nhớ:

- **Không có env schema** (không `env.mjs`, không t3-env). Đây là object viết tay + hàm guard.
- **Kiểm tra lúc gọi, không lúc nạp module.** `next build` phải chạy được trên máy không có
  `.env.local` — CI dựa vào đúng điều này (workflow đặt giá trị giả để build qua).

TTLock tuỳ chọn theo **hai tầng**: `houseConfig.features.smartGate` quyết định có *hiện* giao
diện cổng không; bốn biến `TTLOCK_*` quyết định có *gọi được API* không. Bật cờ mà chưa điền env
là trạng thái hợp lệ — `/admin/gate` hiện danh sách việc cần làm, đúng cho một hai tuần chờ
TTLock duyệt tài khoản.

### Định dạng — `format.ts` (216) + `format.test.ts`

```
formatVND · formatNumber · formatCompactVND
formatDate · formatDateTime · formatMonthYear · toDateInputValue
formatDuration · formatPhone · initials
todayInHouseTz · dayOfMonthInHouseTz
```

Tất cả bám `houseConfig.timeZone`, **không** bám giờ máy chủ. `todayInHouseTz()` là hàm phải
dùng thay cho `new Date()` khi cần "hôm nay" theo nghĩa nhà trọ.

### Kỳ tính tiền — `period.ts` (94) + `period.test.ts`

Kỳ là chuỗi `"YYYY-MM"`, xử lý **thuần chuỗi**, không đụng `Date` — tránh mọi bẫy múi giờ.

```
toPeriod · toMonthInputValue · currentPeriod · previousPeriod · nextPeriod · recentPeriods
defaultDueDate
electricUsed · waterUsed · lineAmount
```

### Giấy tờ và mã QR

| File | Việc |
|---|---|
| `cccd.ts` (136) + test | Parse chuỗi phân cách bằng `\|` in trên thẻ CCCD gắn chip |
| `qr.ts` (131) | Giải mã QR phía client: `BarcodeDetector` nếu có, không thì `zxing-wasm` |
| `image.ts` (155) + test | `fitDimensions()`, `encodeLadder()` — thu nhỏ + hạ chất lượng dần |
| `upload-policy.ts` (151) | Mọi hạn mức. **Không** `import "server-only"` — client cũng đọc |

### Phía server

| File | Việc |
|---|---|
| `email.ts` (123) | `"server-only"`. POST tới `api.resend.com/emails`; `absoluteUrl()` |
| `notify.ts` (329) | `"server-only"`. Dựng thông báo: hàng DB luôn có, email tuỳ cấu hình |
| `cron-auth.ts` (56) | `"server-only"`. So `CRON_SECRET` timing-safe. Thiếu → 503 |
| `auth/dal.ts` (85) | `getCurrentUser` (bọc `cache()`), `requireUser`, `requireAdmin` |
| `auth/zalo.ts` (171) | OAuth Zalo tự viết + `normalizeVietnamesePhone()` |

### Chưa được nối vào

`gate.ts` (417) + `gate.test.ts` (353) — logic thuần cho TTLock: sinh mã, đặt tên mã, cửa sổ
hiệu lực, kế hoạch đồng bộ. **Chưa có importer nào ngoài chính test của nó.** Xem
[10-ra-soat-cau-truc.md](10-ra-soat-cau-truc.md#42).

### `utils.ts` (6)

```ts
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

## `src/components/`

### `ui/` — 18 wrapper Radix

Kiểu shadcn: Radix primitive + `cva` variant + `cn()`. Không có file cấu hình `components.json`
— các component được chép vào repo và sửa tay từ đó.

`alert` `avatar` `badge` `button` `card` `dialog` `dropdown-menu` `input` `label` `select`
`separator` `sheet` `skeleton` `switch` `table` `tabs` `textarea`

> `separator.tsx` và `tabs.tsx` hiện không ai import.

### `common/` — 16 component dùng chung

| File | Export | Việc |
|---|---|---|
| `form.tsx` (123) | `Field`, `SubmitButton`, `FormMessage`, `fieldErrorsOf` | Nền của **mọi** form trong app |
| `confirm-form.tsx` (81) | `ConfirmForm` | Bọc Server Action phá huỷ bằng hộp xác nhận |
| `copy-button.tsx` (86) | `CopyButton`, `SecretField` | Chép clipboard; `SecretField` che rồi cho lộ |
| `page-header.tsx` (67) | `PageHeader` | Tiêu đề + breadcrumb |
| `status-badge.tsx` (97) | 4 badge theo enum | Room / Tenancy / Maintenance status + priority |
| `stat-card.tsx` (65) | `StatCard` | Ô số liệu trên dashboard |
| `empty-state.tsx` (39) | `EmptyState` | Danh sách rỗng |
| `period-picker.tsx` (67) | `PeriodPicker` | Chọn kỳ `YYYY-MM` |
| `link.tsx` (63) | `Link`, `LinkPendingDot` | `next/link` + chấm báo đang tải |
| `nav-progress.tsx` (58) | `NavProgress` | Thanh tiến trình đỉnh trang |
| `logo.tsx` (78) | `HouseLogo`, `BrandLockup` | — |
| `theme.tsx` (39) | `ThemeProvider`, `ThemeToggle` | `next-themes` |
| `install-prompt.tsx` (189) | `InstallPrompt` | Nhắc cài PWA (A2HS) |
| `service-worker.tsx` (54) | `ServiceWorkerRegistration` | Đăng ký `/sw.js?v=SW_VERSION` |
| `landlord-contact.tsx` (103) | `LandlordContact` | Thẻ liên hệ (điện thoại / Zalo / giờ làm) |
| `no-room-notice.tsx` (27) | `NoRoomNotice` | Người thuê chưa được xếp phòng |

### `layout/` — 4 file

| File | Export |
|---|---|
| `nav-items.ts` (93) | `ADMIN_NAV`, `TENANT_NAV`, `TENANT_SECONDARY`, `isActive()`, type `NavItem` |
| `admin-nav.tsx` (134) | `AdminSidebar` (desktop) + `AdminMobileNav` |
| `tenant-nav.tsx` (51) | `TenantBottomNav` |
| `user-menu.tsx` (66) | Dropdown avatar + đăng xuất |

## `src/config/site.ts` (223)

Một object `houseConfig`, và là **nguồn sự thật duy nhất**. Không có bảng `settings` trong
database — cố ý, để không bao giờ có hai nơi ghi hai giá trị khác nhau.

```ts
houseConfig = {
  name, shortName,          // shortName ≤ ~11 ký tự: Android cắt sau ~12, iOS sau ~11
  timeZone,                 // "Asia/Ho_Chi_Minh" — tên IANA, không phải "+07:00"
  tagline, description,
  address: { street, ward, district, city, mapUrl },
  contact: { ownerName, phone, zalo, email, emergencyPhone, officeHours },
  bank:    { name, accountNumber, accountHolder, transferNote } | null,
  rules:   string[],        // hiện tại /me/rules
  defaults: { electricPrice, waterPrice, servicePrice, maxOccupants },
  amenities: [...],          // tiện ích hiện trên trang giới thiệu
  gate:    { pinLength, … },
  features: { publicLanding, publicRoomList, smartGate },
  login:   { /* nút đăng nhập mạng xã hội nào hiện trên /login */ },
}
```

Kèm vài helper suy ra từ object trên: `fullAddress`, `telHref`, `zaloHref`.

`features.smartGate` là **một trong hai công tắc**, cố ý tách đôi:

| Công tắc | Quyết định |
|---|---|
| `features.smartGate` | Có **hiện** mục "Cổng" trên thanh quản trị không |
| `TTLOCK_*` trong `.env.local` | Có **gọi được API** không |

Bật cờ mà chưa điền env là trạng thái hợp lệ và hữu ích: `/admin/gate` hiện danh sách việc cần
làm, không báo lỗi — đúng cho 1–2 tuần chờ TTLock duyệt tài khoản nhà phát triển.

Ghi chép mã cổng / vân tay **không** phải cờ ở đây: đó là sổ tay nội bộ ở
`/admin/tenants/<id>`, bảng `gate_credentials`, RLS chỉ mở cho admin. Luôn bật.

Hai lưu ý:

- **File này đi vào bundle gửi xuống trình duyệt.** Bí mật (clientId, clientSecret, tài khoản
  TTLock) nằm ở `.env.local`, không nằm đây.
- `gate.pinLength = 6` và cửa sổ hiệu lực **60 ngày** là cố ý rộng. Ghi trong file: bị khoá
  ngoài lúc nửa đêm tệ hơn hẳn một mã cũ còn sống thêm vài tuần.

## `src/stores/` — zustand

| File | Dòng | Giữ gì |
|---|---|---|
| `room-filter-store.ts` | 29 | Bộ lọc danh sách phòng của admin |
| `ui-store.ts` | 54 | State giao diện thuần client |

Cả hai **cố ý không giữ dữ liệu domain**. Dữ liệu domain đến từ server component; nhét nó vào
store client là tự tạo ra một bản sao thứ hai phải giữ đồng bộ.

## `src/types/index.ts` (659)

Barrel toàn bộ type domain — 56 interface/type. Ba lớp:

1. **Union type phản chiếu enum Postgres**: `Role`, `RoomStatus`, `InvoiceStatus`, …
2. **Entity**: `Profile`, `Room`, `Tenancy`, `Invoice`, `MaintenanceRequest`, …
3. **View type** (`extends` entity, thêm dữ liệu kèm): `RoomWithOccupancy`, `InvoiceDetail`,
   `TenancyDetail`, `MaintenanceRequestDetail`, `TenantWithCurrentRoom`, …
   Cộng các type tổng hợp cho dashboard: `AdminStats`, `AdminTodo`, `RevenueReport`.

Quy tắc ghi ngay đầu file: **app dùng `camelCase`, DB dùng `snake_case`, việc dịch chỉ xảy ra
trong `lib/db/*`**.

Tiếp: [07 — Quy ước](07-quy-uoc.md)
