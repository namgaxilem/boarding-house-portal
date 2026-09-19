[← `/admin/invoices`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/invoices/new` — Lập hoá đơn

| | |
|---|---|
| File | `src/app/(admin)/admin/invoices/new/page.tsx` (120 dòng) |
| Hàm | `NewInvoicePage` |
| Guard | `requireAdmin()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Chọn **phòng** + **kỳ**, hệ thống dựng sẵn bản nháp từ chỉ số điện nước và đơn giá của phòng;
chủ trọ chỉnh rồi lưu.

## Dữ liệu

```ts
features/invoices/queries :: buildInvoiceDraft, listOccupiedRooms
lib/period                :: currentPeriod, toPeriod
lib/format                :: formatMonthYear
```

| Hàm | Việc |
|---|---|
| `listOccupiedRooms(period)` | Chỉ phòng **đang có người** — phòng trống không lập hoá đơn được |
| `buildInvoiceDraft(roomId, period)` | Dựng bản nháp: tiền phòng, điện, nước, dịch vụ |

Bản nháp tính bằng `lib/period.ts`:

```ts
electricUsed(reading)  →  lineAmount(soDien, room.electricPrice)
waterUsed(reading)     →  lineAmount(soNuoc, room.waterPrice)
```

## Giao diện

```
components/common/period-picker  PeriodPicker  [client]
components/common/empty-state    EmptyState
components/common/page-header    PageHeader
components/common/link           Link
components/ui/{alert,button,skeleton}
features/invoices/components/room-picker   RoomPicker   [client]
features/invoices/components/invoice-form  InvoiceForm  [client] (309 dòng)
```

`InvoiceForm` dùng chung với [`[invoiceId]/edit`](<../[invoiceId]/edit/README.md>).

## Action

`createInvoice` — `features/invoices/actions.ts:65`, schema `invoiceSchema`.

### Ràng buộc

| Mã lỗi | Thông điệp |
|---|---|
| `INVOICE_NO_TENANT` | "Phòng đang trống nên chưa lập được hoá đơn. Xếp người vào phòng trước." |
| `INVOICE_NO_READING` | "Chưa có chỉ số điện nước của tháng này. Ghi chỉ số trước rồi lập hoá đơn." |
| `DUPLICATE_INVOICE` | "Phòng này đã có hoá đơn cho tháng đó. Sửa hoá đơn cũ hoặc huỷ nó trước." |
| `INVOICE_OTHER_NEEDS_NOTE` | "Có khoản phát sinh thì phải ghi lý do." |

Hoá đơn mới luôn ở trạng thái `draft` — phát hành là một bước riêng ở
[`[invoiceId]`](<../[invoiceId]/README.md>).

## Ngày đến hạn

`defaultDueDate(period)` trong `lib/period.ts` dựng ngày mặc định; chủ trọ sửa được.
