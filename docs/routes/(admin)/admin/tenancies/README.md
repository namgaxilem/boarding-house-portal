[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/tenancies` — **không có trang index**

Segment này cố ý không có `page.tsx`. Gõ thẳng `/admin/tenancies` ra 404.

## Vì sao

Hợp đồng thuê không phải thứ người ta duyệt theo danh sách phẳng — luôn xem theo **phòng**
([`/admin/rooms/[roomId]`](<../rooms/[roomId]/README.md>)) hoặc theo **người**
([`/admin/tenants/[tenantId]`](<../tenants/[tenantId]/README.md>)). Cả hai trang đó đều đã hiện
lịch sử thuê của đối tượng mình.

Nên segment này chỉ giữ hai **hành động**:

| URL | Việc | Docs |
|---|---|---|
| `/admin/tenancies/new` | Nhận phòng (check-in) | [new](new/README.md) |
| `/admin/tenancies/[tenancyId]/checkout` | Trả phòng + quyết toán cọc | [checkout](<[tenancyId]/checkout/README.md>) |

Slice `features/tenancies/` cũng phản ánh đúng điều đó: có `actions.ts` và `schema.ts`, **không
có `queries.ts`** — dữ liệu đọc qua `db.listTenanciesByRoom()` / `db.listTenanciesByTenant()`.

## Mô hình dữ liệu

`tenants` và `tenancies` tách đôi có chủ ý: **người** và **hợp đồng thuê** là hai vòng đời khác
nhau. Một người có thể thuê → trả → thuê lại, mỗi lần là một hàng `tenancies` mới.

```
profiles (người)  ──1:N──  tenancies  ──N:1──  rooms
                              │
                              ├─ status: active | ended | terminated
                              ├─ startDate, endDate
                              └─ deposit, depositDeduction, depositRefunded
```
