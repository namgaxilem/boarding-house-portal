[← `(admin)`](../README.md) · [← Bản đồ route](../../README.md) · [← Mục lục docs](../../../README.md)

# `/admin` — Tổng quan chủ trọ

| | |
|---|---|
| File | `src/app/(admin)/admin/page.tsx` (239 dòng) |
| Hàm | `AdminDashboardPage` |
| Guard | `requireAdmin()` từ [`(admin)/layout.tsx`](../README.md#guard) |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Màn hình đầu tiên chủ trọ thấy sau khi đăng nhập. Ba khối:

1. **Việc cần làm** — `TodoCard`, nguồn `getAdminTodo()`
2. **Số liệu** — `StatCard` ×4, nguồn `getAdminStats()`
3. **Hoạt động gần đây** — `db.listRecentEvents()`, nhãn từ `ROOM_EVENT_LABEL`

## Dữ liệu

| Nguồn | Hàm | Trả về |
|---|---|---|
| `features/dashboard/queries` | `getAdminTodo()` | `pendingIdDocuments`, `openMaintenance`, `gateCredentialsToRevoke`, … |
| `features/dashboard/queries` | `getAdminStats()` | Số phòng trống/đang thuê, doanh thu kỳ, nợ đọng |
| `lib/db` | `db.listRecentEvents()` | `room_events` mới nhất |

`getAdminTodo()` cũng được [`(admin)/layout.tsx`](../README.md) gọi để nuôi huy hiệu sidebar.
Gọi hai lần nhưng **chỉ tốn một lượt** — `lib/auth/dal.ts` và các query dùng `cache()` của React
gộp trong cùng một render pass.

## Giao diện

```
components/common/stat-card            StatCard
components/common/status-badge         RoomStatusBadge
components/common/empty-state          EmptyState
components/common/link                 Link
components/ui/{button,card,skeleton}
features/dashboard/components/todo-card TodoCard
lib/format    formatCompactVND, formatDateTime, formatVND
lib/constants ROOM_EVENT_LABEL
```

`formatCompactVND` dùng cho ô số liệu (rút gọn "12,5 tr"), `formatVND` cho số chính xác.

## Đi tiếp

Từ đây rẽ sang mọi khu vực — xem bản đồ ở [`(admin)`](../README.md#bản-đồ-khu-vực).
Báo cáo chi tiết: [`/admin/reports`](reports/README.md).
