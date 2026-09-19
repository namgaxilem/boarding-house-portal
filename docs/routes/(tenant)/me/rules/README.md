[← `/me`](../README.md) · [← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/rules` — Nội quy

| | |
|---|---|
| File | `src/app/(tenant)/me/rules/page.tsx` (47 dòng) |
| Hàm | `MyRulesPage` |
| Guard | `requireUser()` từ layout |
| Metadata | `export const metadata` tĩnh |

Trang tĩnh nhất app. **Không đọc database.**

## Dữ liệu

```ts
config/site :: houseConfig, telHref
```

Nội quy là mảng chuỗi `houseConfig.rules` trong `src/config/site.ts:81`. Sửa nội quy = sửa file
rồi deploy lại — không có màn hình quản trị cho nó.

Lý do: nội quy đổi vài năm một lần, và mỗi lần đổi là một quyết định đáng nằm trong lịch sử git
hơn là trong một hàng database không ai nhớ ai sửa.

## Giao diện

```
components/ui/button  Button    ← nút gọi chủ trọ (telHref)
components/ui/card    Card, CardContent
```

## Đi tiếp

[`/me/contact`](../contact/README.md)
