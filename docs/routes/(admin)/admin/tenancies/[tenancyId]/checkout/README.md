[← `tenancies`](../../README.md) · [← `/admin`](../../../README.md) · [← Bản đồ route](../../../../../README.md) · [← Mục lục docs](../../../../../../README.md)

# `/admin/tenancies/[tenancyId]/checkout` — Trả phòng & quyết toán cọc

| | |
|---|---|
| File | `src/app/(admin)/admin/tenancies/[tenancyId]/checkout/page.tsx` (96 dòng) |
| Hàm | `CheckOutPage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

Trang đụng tiền nhiều nhất app.

## Việc của trang

Kết thúc một hợp đồng: ngày trả, lý do, và **quyết toán tiền cọc** — trừ bao nhiêu, hoàn lại
bao nhiêu, vì sao trừ.

## Dữ liệu

```ts
lib/db     :: db          // db.getTenancy(tenancyId)
lib/format :: toDateInputValue
```

## Giao diện

```
components/common/page-header                PageHeader
components/ui/{alert,skeleton}
features/tenancies/components/check-out-form CheckOutForm  [client] (254 dòng)
```

`CheckOutForm` là component client dài nhất của slice — nó tính lại số hoàn ngay khi gõ, để chủ
trọ thấy con số trước khi bấm.

## Action

`checkOut` — `features/tenancies/actions.ts:50`, schema `checkOutSchema`.

### Ràng buộc quyết toán

| Mã lỗi | Thông điệp |
|---|---|
| `DEDUCTION_OVER_DEPOSIT` | "Số trừ vào cọc lớn hơn số cọc đang giữ. Phần người thuê còn nợ vượt quá tiền cọc thì lập một hoá đơn riêng." |
| `DEDUCTION_NEEDS_NOTE` | "Có trừ vào cọc thì phải ghi lý do." |
| `END_BEFORE_START` | "Ngày trả phòng không được trước ngày nhận phòng." |
| `TENANCY_ALREADY_ENDED` | "Hợp đồng này đã kết thúc rồi." |

Quy tắc đáng nhớ: **tiền cọc không bao giờ âm**. Nếu người thuê nợ nhiều hơn số cọc, phần vượt
phải thành một hoá đơn riêng — không nhét vào ô trừ cọc.

Lý do trừ được ghép vào ghi chú của `room_events` (`supabase-adapter.ts:1980-1981`).

> ⚠️ Đoạn đó tự `toLocaleString("vi-VN")` thay vì gọi `formatVND` từ `lib/format.ts` — tầng
> adapter đang làm việc của tầng hiển thị. Xem
> [10](../../../../../../10-ra-soat-cau-truc.md#45).

## Sau khi trả phòng

- Phòng chuyển về `vacant` và lại xuất hiện ở [`/rooms`](<../../../../../(marketing)/rooms/README.md>)
- Mã cổng của người đó thành "cần thu hồi" → đếm vào huy hiệu
  [`/admin/gate`](../../../gate/README.md) qua `db.listGateCredentialsToRevoke()`
