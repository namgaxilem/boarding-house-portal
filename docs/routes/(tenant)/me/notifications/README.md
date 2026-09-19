[← `/me`](../README.md) · [← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/notifications` — Thông báo

| | |
|---|---|
| File | `src/app/(tenant)/me/notifications/page.tsx` (42 dòng) |
| Hàm | `NotificationsPage` |
| Guard | `requireUser()` từ layout |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
features/notifications/queries :: listMyNotifications
```

Bảng `notifications`, enum `notification_type`. Trường `emailSentAt` khác `null` nghĩa là đã có
bản gửi kèm vào hộp thư.

## Thông báo sinh ra từ đâu

`src/lib/notify.ts` (329 dòng, `"server-only"`) là **nơi duy nhất** dựng thông báo. Mỗi cái luôn
ghi một hàng vào database; gửi email là phần tuỳ chọn, chỉ chạy khi `isEmailConfigured`
(cần **cả** `RESEND_API_KEY` lẫn `EMAIL_FROM`).

Nguồn chính:

| Sự kiện | Ai kích hoạt |
|---|---|
| Hoá đơn phát hành | `issueInvoice` — [`/admin/invoices/[invoiceId]`](<../../../(admin)/admin/invoices/[invoiceId]/README.md>) |
| Hoá đơn sắp / đã quá hạn | Cron [`/api/cron/invoice-reminders`](../../../api/README.md) |
| Phiếu báo hỏng đổi trạng thái | `setRequestStatus`, `closeRequest` |

## Giao diện

```
features/notifications/components/notification-list NotificationList  [client]
components/common/page-header  PageHeader
components/ui/skeleton         Skeleton
```

Chuông đếm số chưa đọc nằm ở [`(tenant)/layout.tsx`](../../README.md#layout-dựng-gì)
(`NotificationBell`), bọc Suspense để không chặn khung trang.

## Action

| Action | File | Việc |
|---|---|---|
| `openNotification` | `features/notifications/actions.ts:16` | Đánh dấu đã đọc **rồi điều hướng** tới đối tượng liên quan |
| `markAllNotificationsRead` | `features/notifications/actions.ts:36` | Đọc hết |

`openNotification` gộp hai việc vào một Server Action thay vì "bấm link, rồi một `useEffect` gửi
request đánh dấu" — cách sau hỏng khi người dùng bấm rồi thoát ngay.
