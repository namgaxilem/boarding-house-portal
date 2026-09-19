[← `(marketing)`](../README.md) · [← Bản đồ route](../../README.md) · [← Mục lục docs](../../../README.md)

# `/` — Trang giới thiệu

| | |
|---|---|
| File | `src/app/(marketing)/page.tsx` (193 dòng) |
| Hàm | `LandingPage` |
| Guard | không |
| Metadata | không có riêng — kế thừa từ `src/app/layout.tsx` |
| Render | Server Component |

`/` do group `(marketing)` sở hữu. **Không có `src/app/page.tsx`.**

## Việc của trang

Bán phòng cho người lạ. Nội dung: giới thiệu nhà trọ, vài phòng trống tiêu biểu, đường dẫn
sang `/rooms` và `/contact`, nút gọi điện trực tiếp.

## Dữ liệu

| Nguồn | Hàm | Ghi chú |
|---|---|---|
| `lib/db/public-rooms` | `listVacantRooms()` | Có cache; là lối đọc DB duy nhất của trang công khai |
| `config/site` | `houseConfig`, `fullAddress`, `telHref` | Tên, tagline, mô tả, địa chỉ, số gọi |

## Giao diện

```
components/common/link      Link
components/ui/button        Button
components/ui/card          Card, CardContent
components/ui/badge         Badge
lib/format                  formatVND
```

Giá phòng hiện qua `formatVND` — không tự `toLocaleString`.

## Đi tiếp

- [`/rooms`](../rooms/README.md) — danh sách phòng trống đầy đủ
- [`/contact`](../contact/README.md) — liên hệ chủ trọ
- `/login` — [`(auth)/login`](<../../(auth)/login/README.md>)
