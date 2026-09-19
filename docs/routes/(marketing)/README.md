[← Bản đồ route](../README.md) · [← Mục lục docs](../../README.md)

# Route group `(marketing)` — mặt tiền công khai

| | |
|---|---|
| Layout | `src/app/(marketing)/layout.tsx` (61 dòng) |
| Guard | **không có** — mọi khách đều vào được |
| URL | `/`, `/rooms`, `/contact` |

Ba đường dẫn này nằm trong `PUBLIC_PATHS` của [`src/proxy.ts`](../../03-dinh-tuyen.md#lớp-1--srcproxyts-chặn-lạc-quan),
nên khách chưa đăng nhập đi thẳng qua, không bị đá về `/login`.

## Layout dựng gì

```
components/common/link            Link
components/ui/button              Button
components/common/logo            BrandLockup
components/common/theme           ThemeToggle
components/layout/marketing-auth  MarketingAuthSlot, MarketingAuthSlotFallback
config/site                       houseConfig, fullAddress
```

Header công khai: logo + tên nhà trọ, link Phòng trống / Liên hệ, nút chuyển sáng/tối, và ô
tài khoản ở góc phải. Không có nav phức tạp — ba trang thì một hàng link là đủ.

### Ô tài khoản ở góc phải

| Trạng thái | Hiện gì |
|---|---|
| Chưa đăng nhập | Nút **Đăng nhập** → `/login` |
| Đã đăng nhập | **Avatar** + menu tài khoản (`UserMenu`) — giống hệt header của `(admin)` và `(tenant)` |

`MarketingAuthSlot` là **component riêng chứ không đọc phiên thẳng trong layout**, và đó là
điểm mấu chốt: `(marketing)/layout.tsx` phải ở lại dạng **đồng bộ**. Đọc cookie là dữ liệu
thời-điểm-yêu-cầu — `await` nó trong layout là mất luôn PPR của cả ba trang công khai, tức là
ba trang người lạ vào nhiều nhất.

Cách làm đúng: layout bọc slot trong `<Suspense>`, phần còn lại của header prerender bình
thường, chỗ này stream vào sau. Kiểm chứng bằng `next build`:

```
┌ ◐ /
├ ◐ /contact
└ ◐ /rooms        ◐ = Partial Prerender, không phải ƒ Dynamic
```

Hai chi tiết nhỏ nhưng cố ý:

- **`await connection()` gọi trong slot, không trong `getCurrentUser`** — hàm đó bọc `cache()`
  nên từ lượt render thứ hai nó trả promise đã ghi nhớ và `connection()` không chạy nữa. Cùng
  cái bẫy đã ghi ở `lib/auth/dal.ts:52-66`.
- **Fallback là ô xám, không phải nút "Đăng nhập" dựng sẵn.** Chủ trọ đang đăng nhập mở trang
  giới thiệu sẽ thấy nút đó nháy lên rồi biến thành avatar — một trạng thái sai, dù chỉ trong
  tích tắc. Slot được bọc trong `min-w-20` để hai trạng thái chiếm đúng một bề rộng, header
  không nhảy khi stream vào.

Mọi nội dung tĩnh (tên, địa chỉ, tagline, số điện thoại) đến từ
[`config/site.ts`](../../06-thu-vien-dung-chung.md#srcconfigsitets-223), không từ database.

## Dữ liệu động duy nhất: phòng trống

Cả `/` và `/rooms` gọi chung một hàm:

```ts
// src/lib/db/public-rooms.ts (17 dòng)
import "server-only";
export const listVacantRooms = /* cache */ …
```

Đây là hàm **duy nhất** trong `lib/db/` được gọi thẳng từ trang công khai, và nó có cache — vì
danh sách phòng trống đổi vài ngày một lần chứ không đổi theo request.

## Trang trong group

| URL | Docs | Dòng |
|---|---|---|
| `/` | [page](page/README.md) | 193 |
| `/rooms` | [rooms](rooms/README.md) | 176 |
| `/contact` | [contact](contact/README.md) | 157 |
