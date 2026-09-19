[← Bản đồ route](../README.md) · [← Mục lục docs](../../README.md)

# `/api/*` — Route handler

Ba handler, tất cả chỉ export `GET`, **không có giao diện**. Cả `/api/health` lẫn `/api/cron/*`
nằm trong `PUBLIC_PREFIXES` của proxy nên đi thẳng, không qua session.

```
src/app/api/
├─ health/route.ts                  (25)
└─ cron/
   ├─ invoice-reminders/route.ts    (44)
   └─ keep-alive/route.ts           (21)
```

---

## `GET /api/health`

```ts
lib/env :: isSupabaseConfigured
lib/db  :: db
```

Kiểm tra sống: cấu hình Supabase có đủ không, và database có trả lời không. Dùng cho uptime
monitor và để xác nhận dev server đã sẵn sàng.

**Công khai, không cần bí mật.** Nó không trả dữ liệu nào của nhà trọ.

---

## Xác thực cho `/api/cron/*`

```ts
lib/cron-auth :: authorizeCron
```

`src/lib/cron-auth.ts` (56 dòng, `"server-only"`) so header `Authorization: Bearer <CRON_SECRET>`
kiểu **timing-safe**.

**Thiếu `CRON_SECRET` → trả 503, không phải mở toang.** Fail-closed, khác với Resend / TTLock /
Zalo vốn fail-soft. Lý do: một endpoint cron không có bí mật là một endpoint ai cũng gọi được.

---

## `GET /api/cron/keep-alive`

```ts
lib/db :: db
```

Một truy vấn rẻ để project Supabase gói free không bị tự ngủ sau thời gian không hoạt động.

Gọi bởi `.github/workflows/keep-alive.yml`, hằng ngày, cần secret `CRON_SECRET` + `APP_URL`.

---

## `GET /api/cron/invoice-reminders`

```ts
lib/db     :: db
lib/format :: todayInHouseTz
lib/notify :: notifyInvoiceDue
```

Tìm hoá đơn sắp đến hạn và đã quá hạn, rồi gửi nhắc.

| Bước | Hàm |
|---|---|
| "Hôm nay" theo giờ nhà trọ | `todayInHouseTz()` — **không** `new Date()` |
| Lấy hoá đơn quá hạn | `db.listOverdueInvoices()` |
| Chống gửi trùng | `db.hasInvoiceDueReminder()` |
| Gửi | `notifyInvoiceDue()` — ghi hàng `notifications` + email nếu `isEmailConfigured` |

`todayInHouseTz()` quan trọng ở đây hơn bất kỳ đâu: GitHub Actions chạy UTC. Dùng `new Date()`
thì cron lúc 00:30 UTC sẽ coi "hôm nay" là ngày hôm trước theo giờ Việt Nam, và nhắc hạn lệch
một ngày.

Gọi bởi `.github/workflows/invoice-reminders.yml`, hằng ngày.

---

## Không có scheduler trong tiến trình

Không `vercel.json`, không cron nội bộ. Lịch nằm ở GitHub Actions — đổi lịch là sửa `cron:`
trong workflow. Xem [09-chay-va-trien-khai.md](../../09-chay-va-trien-khai.md#ci--githubworkflows).
