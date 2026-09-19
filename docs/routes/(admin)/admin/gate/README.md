[← `/admin`](../README.md) · [← `(admin)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/admin/gate` — Cổng thông minh (TTLock)

| | |
|---|---|
| File | `src/app/(admin)/admin/gate/page.tsx` (254 dòng) |
| Hàm | `AdminGatePage` |
| Guard | `requireAdmin()` từ layout + lặp lại trong `queries.ts` |
| Metadata | `export const metadata` tĩnh |

> **Trạng thái: tính năng làm dở.** Trang render được và hữu ích, nhưng phần nói chuyện với
> thiết bị TTLock chưa tồn tại. Xem [10-ra-soat-cau-truc.md](../../../../10-ra-soat-cau-truc.md#42).

## Hai công tắc

| Công tắc | Quyết định | Nếu tắt |
|---|---|---|
| `houseConfig.features.smartGate` | Có **hiện** mục "Cổng" trên nav không | Trang biến mất khỏi giao diện |
| `TTLOCK_*` (4 biến trong `.env.local`) | Có **gọi được API** không | Trang hiện **checklist thiết lập**, không báo lỗi |

Bật cờ mà chưa điền env là trạng thái hợp lệ và có ích — đúng cho 1–2 tuần chờ TTLock duyệt
tài khoản nhà phát triển.

```ts
lib/env :: isTTLockConfigured
```

## Dữ liệu

```ts
features/gate/queries :: getGateOverview
lib/format            :: formatDate
```

```ts
// src/features/gate/queries.ts — toàn bộ slice, 25 dòng
export async function getGateOverview() {
  await requireAdmin();
  const [locks, toRevoke] = await Promise.all([
    db.listGateLocks(),
    db.listGateCredentialsToRevoke(),
  ]);
  return { locks, toRevoke, primaryLock: locks.find((l) => l.isPrimary) ?? null };
}
```

Chỉ đọc **hai** bảng: `gate_locks` và `gate_credentials`.

## Huy hiệu "cần thu hồi"

`listGateCredentialsToRevoke()` tìm người **đã trả phòng mà mã cổng vẫn còn sống**. Đây là mục
nav thứ ba có huy hiệu, và nó khác hai mục kia: việc do **chính hệ thống phát hiện**, đúng loại
việc con người hay quên (`components/layout/nav-items.ts:22-31`).

## Phần chưa đấu dây

| Thành phần | Trạng thái |
|---|---|
| `src/lib/gate.ts` (417 dòng) | Logic thuần: sinh mã, đặt/đọc tên mã, cửa sổ hiệu lực, kế hoạch đồng bộ. **0 importer** ngoài test của nó |
| `src/lib/gate.test.ts` (353 dòng) | Test cho code chưa ai gọi |
| Bảng `gate_passcodes`, `gate_fingerprints`, `gate_events`, `integration_tokens` | Đã tạo trong migration, **0 truy vấn** từ `src/` |
| 8 type `Gate*` trong `types/index.ts` | Không nơi nào tham chiếu |
| Tầng HTTP TTLock | **Chưa viết.** `fetch()` trong `src/` chỉ có ở `lib/auth/zalo.ts` và `lib/email.ts` |

## Giao diện

```
components/ui/alert    Alert, AlertDescription, AlertTitle   ← checklist thiết lập
components/ui/badge    Badge
components/common/page-header  PageHeader
components/common/link         Link
components/ui/{button,card,skeleton}
```

## Ghi chép mã cổng thì ở chỗ khác

Sổ tay mã cổng / vân tay của từng người nằm ở
[`/admin/tenants/[tenantId]`](<../tenants/[tenantId]/README.md>) (bảng `gate_credentials`), và
**luôn bật** bất kể `smartGate` — nó không gọi API nào.

## Tham số thiết kế

`houseConfig.gate`: `pinLength: 6` (TTLock nhận 4–9; 6 là mức người ta nhớ được) và cửa sổ hiệu
lực **60 ngày** — cố ý rộng, vì bị khoá ngoài lúc nửa đêm tệ hơn hẳn một mã cũ còn sống thêm
vài tuần.
