[← Mục lục docs](../README.md)

# Bản đồ route

Cây thư mục dưới `docs/routes/` **soi đúng `src/app/`**, kể cả route group. Muốn đọc tài liệu
của một trang, đi cùng đường dẫn như trong code:

```
src/app/(admin)/admin/rooms/[roomId]/page.tsx
docs/routes/(admin)/admin/rooms/[roomId]/README.md
```

Route group `(marketing)` `(auth)` `(admin)` `(tenant)` **không** xuất hiện trong URL, nhưng
được giữ trong cây docs vì mỗi group mang một layout và một guard riêng — thông tin đó nằm ở
`README.md` của chính group, và trang con không lặp lại.

## Quy ước của mỗi trang

Mỗi `README.md` mô tả một route: file nguồn, guard, dữ liệu đọc từ đâu, action nào ghi,
component nào dựng giao diện, và đi tiếp được sang đâu.

Thứ **không** nằm ở đây vì đã có chỗ riêng:

| Chủ đề | Đọc ở |
|---|---|
| Ba lớp bảo vệ, proxy, matcher | [03-dinh-tuyen.md](../03-dinh-tuyen.md) |
| `Repository`, adapter, bảng, bucket | [04-tang-du-lieu.md](../04-tang-du-lieu.md) |
| Hợp đồng `actions` / `queries` / `schema` | [05-feature-slices.md](../05-feature-slices.md) |
| Đặt tên, xử lý lỗi, mẫu form | [07-quy-uoc.md](../07-quy-uoc.md) |

## Toàn bộ route

### Công khai — [`(marketing)`](<(marketing)/README.md>)

| URL | Docs | Dòng |
|---|---|---|
| `/` | [page](<(marketing)/page/README.md>) | 193 |
| `/rooms` | [rooms](<(marketing)/rooms/README.md>) | 176 |
| `/contact` | [contact](<(marketing)/contact/README.md>) | 157 |

### Chưa đăng nhập — [`(auth)`](<(auth)/README.md>)

| URL | Docs | Dòng |
|---|---|---|
| `/login` | [login](<(auth)/login/README.md>) | 60 |
| `/forgot-password` | [forgot-password](<(auth)/forgot-password/README.md>) | 33 |
| `/reset-password` | [reset-password](<(auth)/reset-password/README.md>) | 31 |

### Chủ trọ — [`(admin)`](<(admin)/README.md>)

| URL | Docs | Dòng |
|---|---|---|
| `/admin` | [admin](<(admin)/admin/README.md>) | 239 |
| `/admin/rooms` | [rooms](<(admin)/admin/rooms/README.md>) | 84 |
| `/admin/rooms/new` | [rooms/new](<(admin)/admin/rooms/new/README.md>) | 27 |
| `/admin/rooms/[roomId]` | [rooms/[roomId]](<(admin)/admin/rooms/[roomId]/README.md>) | 306 |
| `/admin/rooms/[roomId]/edit` | [rooms/[roomId]/edit](<(admin)/admin/rooms/[roomId]/edit/README.md>) | 55 |
| `/admin/tenants` | [tenants](<(admin)/admin/tenants/README.md>) | 182 |
| `/admin/tenants/new` | [tenants/new](<(admin)/admin/tenants/new/README.md>) | 27 |
| `/admin/tenants/[tenantId]` | [tenants/[tenantId]](<(admin)/admin/tenants/[tenantId]/README.md>) | 346 |
| `/admin/tenants/[tenantId]/edit` | [tenants/[tenantId]/edit](<(admin)/admin/tenants/[tenantId]/edit/README.md>) | 57 |
| *(không có trang index)* | [tenancies](<(admin)/admin/tenancies/README.md>) | — |
| `/admin/tenancies/new` | [tenancies/new](<(admin)/admin/tenancies/new/README.md>) | 99 |
| `/admin/tenancies/[tenancyId]/checkout` | [tenancies/[tenancyId]/checkout](<(admin)/admin/tenancies/[tenancyId]/checkout/README.md>) | 96 |
| `/admin/meters` | [meters](<(admin)/admin/meters/README.md>) | 82 |
| `/admin/invoices` | [invoices](<(admin)/admin/invoices/README.md>) | 199 |
| `/admin/invoices/new` | [invoices/new](<(admin)/admin/invoices/new/README.md>) | 120 |
| `/admin/invoices/[invoiceId]` | [invoices/[invoiceId]](<(admin)/admin/invoices/[invoiceId]/README.md>) | 272 |
| `/admin/invoices/[invoiceId]/edit` | [invoices/[invoiceId]/edit](<(admin)/admin/invoices/[invoiceId]/edit/README.md>) | 60 |
| `/admin/maintenance` | [maintenance](<(admin)/admin/maintenance/README.md>) | 124 |
| `/admin/maintenance/new` | [maintenance/new](<(admin)/admin/maintenance/new/README.md>) | 46 |
| `/admin/maintenance/[requestId]` | [maintenance/[requestId]](<(admin)/admin/maintenance/[requestId]/README.md>) | 234 |
| `/admin/maintenance/[requestId]/edit` | [maintenance/[requestId]/edit](<(admin)/admin/maintenance/[requestId]/edit/README.md>) | 64 |
| `/admin/identity` | [identity](<(admin)/admin/identity/README.md>) | 138 |
| `/admin/gate` | [gate](<(admin)/admin/gate/README.md>) | 254 |
| `/admin/reports` | [reports](<(admin)/admin/reports/README.md>) | 282 |
| `/admin/settings` | [settings](<(admin)/admin/settings/README.md>) | 180 |
| `/admin/settings/account` | [settings/account](<(admin)/admin/settings/account/README.md>) | 72 |
| `/admin/settings/payments` | [settings/payments](<(admin)/admin/settings/payments/README.md>) | 35 |
| `/admin/settings/wifi` | [settings/wifi](<(admin)/admin/settings/wifi/README.md>) | 38 |

### Người thuê — [`(tenant)`](<(tenant)/README.md>)

| URL | Docs | Dòng |
|---|---|---|
| `/me` | [me](<(tenant)/me/README.md>) | 201 |
| `/me/room` | [me/room](<(tenant)/me/room/README.md>) | 205 |
| `/me/profile` | [me/profile](<(tenant)/me/profile/README.md>) | 151 |
| `/me/identity` | [me/identity](<(tenant)/me/identity/README.md>) | 160 |
| `/me/invoices` | [me/invoices](<(tenant)/me/invoices/README.md>) | 104 |
| `/me/invoices/[invoiceId]` | [me/invoices/[invoiceId]](<(tenant)/me/invoices/[invoiceId]/README.md>) | 75 |
| `/me/maintenance` | [me/maintenance](<(tenant)/me/maintenance/README.md>) | 86 |
| `/me/maintenance/new` | [me/maintenance/new](<(tenant)/me/maintenance/new/README.md>) | 54 |
| `/me/maintenance/[requestId]` | [me/maintenance/[requestId]](<(tenant)/me/maintenance/[requestId]/README.md>) | 167 |
| `/me/maintenance/[requestId]/edit` | [me/maintenance/[requestId]/edit](<(tenant)/me/maintenance/[requestId]/edit/README.md>) | 59 |
| `/me/wifi` | [me/wifi](<(tenant)/me/wifi/README.md>) | 92 |
| `/me/rules` | [me/rules](<(tenant)/me/rules/README.md>) | 47 |
| `/me/notifications` | [me/notifications](<(tenant)/me/notifications/README.md>) | 42 |

### Route handler — không có giao diện

| URL | Docs |
|---|---|
| `/api/health`, `/api/cron/*` | [api](api/README.md) |
| `/auth/callback`, `/auth/zalo`, `/auth/zalo/callback` | [auth](auth/README.md) |

### File gốc — [`(root)`](root/README.md)

`layout.tsx`, `error.tsx`, `not-found.tsx`, `manifest.ts`, `globals.css`.

## Ghi chú chung cho mọi trang

- **Không có `loading.tsx`.** Skeleton khai ngay trong route file và đặt trong
  `<Suspense fallback={…}>`. Xem [10-ra-soat-cau-truc.md](../10-ra-soat-cau-truc.md#46).
- **Guard nằm ở layout của group**, và lặp lại ở `queries.ts` như lớp thứ hai.
- **Trang chi tiết dùng `generateMetadata`**, trang danh sách dùng `export const metadata` tĩnh.
