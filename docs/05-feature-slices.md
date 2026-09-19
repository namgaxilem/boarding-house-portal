[← Mục lục](README.md)

# 05 — Feature slices

## Hợp đồng của một slice

```
src/features/<slice>/
├─ actions.ts       "use server"   — ghi dữ liệu
├─ queries.ts       "server-only"  — đọc dữ liệu
├─ schema.ts        Zod            — kiểm tra form
└─ components/                     — giao diện riêng của slice
```

Không phải slice nào cũng đủ bốn phần. Thiếu phần nào nghĩa là slice đó không cần phần đó —
`dashboard` chỉ đọc nên không có `actions.ts`; `gate` mới chỉ có `queries.ts`.

### `actions.ts` — khuôn mẫu

Mọi Server Action đi theo đúng bốn bước:

```ts
"use server";

export async function updateRoom(_prev: FormState, formData: FormData) {
  await requireAdmin();                          // 1. guard

  const parsed = roomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);   // 2. Zod

  try {
    await db.updateRoom(id, parsed.data);        // 3. tầng dữ liệu
  } catch (error) {
    return fail(describeError(error, "Không lưu được phòng."));
  }

  revalidatePath("/admin/rooms");                // 4. làm mới + điều hướng
  redirect(`/admin/rooms/${id}`);
}
```

Không bao giờ ném lỗi database thẳng ra UI. `describeError()` trong
[`lib/action-result.ts`](../src/lib/action-result.ts) dịch mã lỗi sang tiếng Việt chủ trọ đọc
hiểu và hành động được — ví dụ `ROOM_OCCUPIED` → *"Phòng đang có người ở. Cho trả phòng trước
khi xoá."*

### `queries.ts` — khuôn mẫu

```ts
import "server-only";

export async function getGateOverview() {
  await requireAdmin();                          // guard cũng nằm ở đây
  const [locks, toRevoke] = await Promise.all([  // đọc song song
    db.listGateLocks(),
    db.listGateCredentialsToRevoke(),
  ]);
  return { locks, toRevoke, primaryLock: locks.find((l) => l.isPrimary) ?? null };
}
```

Guard lặp lại ở đây dù layout đã gọi — cố ý. Comment trong `features/gate/queries.ts` nói rõ:
đây là **lớp thứ hai**, RLS mới là lớp chặn thật, nhưng gọi ở đây thì người thuê gõ tay
`/admin/gate` nhận được chuyển hướng thay vì một trang trống trông như lỗi.

### `schema.ts`

Một Zod schema mỗi form, đặt tên `camelCaseSchema` (`roomSchema`, `invoiceSchema`,
`checkInSchema`, …). Thông điệp lỗi viết tiếng Việt ngay trong schema.

`invalid()` dựng `fieldErrors` từ `error.issues` chứ không dùng `flatten()` — helper đó đổi
chỗ giữa zod 3 và 4, còn `issues` thì ổn định ở cả hai.

## 14 slice

### `auth` (666 dòng)

| File | Export |
|---|---|
| `actions.ts` (202) | `signIn`, `signOut`, `requestPasswordReset`, `resetPassword`, `changePassword`, `updateAccount` |
| `oauth-actions.ts` (64) | `signInWithGoogle`, `signInWithFacebook`, `signInWithZalo` |
| `schema.ts` (63) | — |
| `components/` | `login-form`, `password-forms`, `account-form`, `social-buttons` |

Không có `queries.ts` — phiên đăng nhập đọc qua `lib/auth/dal.ts`.

Google và Facebook đi qua provider có sẵn của Supabase. **Zalo thì không** — Supabase không hỗ
trợ, nên `lib/auth/zalo.ts` (171 dòng) tự dựng OAuth: sinh state, đặt cookie, đổi mã, chuẩn hoá
số điện thoại Việt Nam để khớp tài khoản.

### `rooms` (1260 dòng)

| File | Export chính |
|---|---|
| `actions.ts` (146) | CRUD phòng, tạo/xoá `room_events` |
| `photo-actions.ts` (105) | upload, đặt ảnh bìa, đổi thứ tự, xoá |
| `queries.ts` (14) | mỏng — phần lớn đọc qua `db` trực tiếp trong page |
| `schema.ts` (70) | `roomSchema`, helper `money()` |
| `components/` | 6 file, gồm `photo-uploader.tsx` |

### `tenants` (662) · `tenancies` (615)

Tách đôi có chủ ý: **người** và **hợp đồng thuê** là hai vòng đời khác nhau. Một người có thể
thuê rồi trả rồi thuê lại.

- `tenants/actions.ts` (207): CRUD người thuê, đặt lại mật khẩu, cấp mã cổng, sửa hồ sơ của
  chính mình. Các thao tác tài khoản cần **service-role key**.
- `tenancies/actions.ts` (109): `checkIn`, `checkOut`. `check-out-form.tsx` (254) xử lý cả
  quyết toán cọc — trừ tiền, hoàn tiền, bắt buộc ghi lý do khi có trừ.

`tenancies` không có `queries.ts`; dữ liệu đọc qua `db.listTenanciesByRoom` / `…ByTenant`.

### `meters` (333) → `invoices` (1297)

Đây là mạch nghiệp vụ chính của app:

```
Ghi chỉ số  →  meter_readings (điện đầu/cuối, nước đầu/cuối, theo kỳ YYYY-MM)
   │
   ▼  lib/period.ts: electricUsed(), waterUsed(), lineAmount()
   │
Lập hoá đơn →  invoices (draft → issued → paid | void)
   │
   ▼  notify.ts: gửi thông báo + email khi phát hành và khi sắp/đã quá hạn
   │
Cron /api/cron/invoice-reminders chạy hằng ngày
```

`invoices/actions.ts` (328) có cả `generateMonthlyInvoices` — lập hàng loạt cho cả nhà trọ.
Ràng buộc: phòng phải có người (`INVOICE_NO_TENANT`) và phải có chỉ số của kỳ đó
(`INVOICE_NO_READING`).

`invoice-print.tsx` + `invoice-print-header.tsx` dựng bản in; `globals.css` có `@media print`
riêng cho việc này.

### `identity` (1067)

Luồng giấy tờ CCCD, nhạy cảm nhất repo.

```
Người thuê: quét QR trên thẻ CCCD  →  id-scanner.tsx (483 dòng)
   │  BarcodeDetector nếu trình duyệt có; không thì zxing-wasm (lib/qr.ts)
   │  lib/cccd.ts parse chuỗi phân cách bằng dấu |
   ▼
Gửi hồ sơ + 2 ảnh  →  bucket id-photos (RIÊNG TƯ)
   ▼
Chủ trọ duyệt/từ chối  →  /admin/identity
```

Ba điểm bảo mật:

1. Bucket `id-photos` **không công khai**. Ảnh chỉ đọc được qua **signed URL hạn 2 phút** —
   đủ để trình duyệt tải, không đủ để chia sẻ lại.
2. Mọi lần truy cập ghi vào `id_document_access_log`.
3. Đọc mã QR, **không OCR** — không có ảnh nào bị gửi đi đâu để nhận dạng.

### `maintenance` (1055)

Vòng đời phiếu báo hỏng: `open → in_progress → resolved → closed`. Người thuê chỉ sửa/đóng
được phiếu của chính mình, và **chỉ khi chủ trọ chưa bắt đầu xử lý** (`MAINTENANCE_LOCKED`).
Kèm ảnh, upload qua cùng pipeline với ảnh phòng.

### `payments` (866)

Quản lý cách nhận tiền: tài khoản ngân hàng và ảnh QR. Có thứ tự ưu tiên —
`movePaymentAccount` đổi `sort_order`, và dòng mới luôn xuống cuối để không cướp chỗ cách
đang được ưu tiên.

### `wifi` (334)

`wifi_networks` có `scope`: `global` | `floor` | `room`. Người thuê chỉ thấy mạng áp dụng cho
mình. Query `getMyWifi` nằm ở `tenants/queries.ts`, không ở slice này.

### `notifications` (251)

`openNotification` (đánh dấu đã đọc rồi điều hướng), `markAllNotificationsRead`.
`notification-bell.tsx` hiện số chưa đọc trên thanh nav.

### `dashboard` (317)

Chỉ đọc. `getAdminTodo` (việc cần làm), `getAdminStats` (số liệu tổng quan),
`getRevenueReport` (doanh thu theo tháng, `REPORT_MONTHS` tháng gần nhất).

`AdminTodo` là nguồn cho huy hiệu trên sidebar — xem
[03-dinh-tuyen.md](03-dinh-tuyen.md#điều-hướng-phía-client).

### `settings` (150)

Chỉ có component: `settings-tabs.tsx` (thanh tab tự dựng bằng `Link` + `usePathname`) và
`storage-usage.tsx` (đọc `storage_usage()`). Nội dung cấu hình đến thẳng từ
`src/config/site.ts`, không qua database.

### `gate` (25)

Slice nhỏ nhất. Chỉ `queries.ts` với `getGateOverview()`. Logic thuần cho TTLock đã viết xong
ở `src/lib/gate.ts` (417 dòng) nhưng **chưa được nối vào** — xem
[10-ra-soat-cau-truc.md](10-ra-soat-cau-truc.md#42).

Tiếp: [06 — Thư viện dùng chung](06-thu-vien-dung-chung.md)
