# Tài liệu cấu trúc dự án

Thư mục này mô tả **cấu trúc** của `boarding-house-portal` — code nằm ở đâu, tại sao nằm ở đó,
và quy ước nào giữ cho nó nhất quán.

Đây không phải hướng dẫn vận hành. Cài đặt Supabase cloud, cấu hình OAuth, backup, MCP —
tất cả nằm ở [`../README.md`](../README.md) ở gốc repo.

## Mục lục

| # | Tài liệu | Nội dung |
|---|---|---|
| 01 | [Tổng quan](01-tong-quan.md) | Stack, 6 nguyên tắc kiến trúc, sơ đồ luồng một request |
| 02 | [Cây thư mục](02-cay-thu-muc.md) | Toàn bộ cấu trúc file, kèm số dòng |
| 03 | [Định tuyến & phân quyền](03-dinh-tuyen.md) | Route group, proxy, ba lớp bảo vệ |
| 04 | [Tầng dữ liệu](04-tang-du-lieu.md) | Repository ↔ adapter, 4 client Supabase, 20 bảng, 4 bucket |
| 05 | [Feature slices](05-feature-slices.md) | 14 slice và hợp đồng `actions` / `queries` / `schema` / `components` |
| 06 | [Thư viện dùng chung](06-thu-vien-dung-chung.md) | `lib/`, `components/`, `config/`, `stores/`, `types/` |
| 07 | [Quy ước](07-quy-uoc.md) | Đặt tên, xử lý lỗi, `ActionResult`, ranh giới server/client |
| 08 | [Cấu hình](08-cau-hinh.md) | Biến môi trường, `next.config.ts`, tsconfig, eslint, vitest, PWA |
| 09 | [Chạy & triển khai](09-chay-va-trien-khai.md) | Dev local/cloud, script, CI, cron |
| 10 | [Rà soát cấu trúc](10-ra-soat-cau-truc.md) | Kết quả audit: code chết, trùng lặp, build/CI đang hỏng |
| 11 | [Tính năng chưa làm](11-tinh-nang-chua-lam.md) | Khoảng trống còn lại, giới hạn quy mô, thứ đã cố ý loại bỏ |

## Tài liệu theo từng trang

[`routes/`](routes/README.md) — một `README.md` cho **mỗi route**, cây thư mục soi đúng `src/app/`
kể cả route group:

```
src/app/(admin)/admin/rooms/[roomId]/page.tsx
docs/routes/(admin)/admin/rooms/[roomId]/README.md
```

Mỗi trang ghi: file nguồn, guard, dữ liệu đọc từ đâu, action nào ghi, component nào dựng giao
diện, đi tiếp được sang đâu. Nội dung xuyên suốt (quy ước, tầng dữ liệu, cấu hình) không lặp lại
ở đó — trang chỉ link ngược về 01–10.

## Quy ước của chính thư mục này

- Chỉ chứa `.md`. Không ảnh, không sơ đồ nhị phân — sơ đồ vẽ bằng ASCII trong chính file.
- Mỗi tài liệu tự đứng được; liên kết chéo bằng đường dẫn tương đối.
- Khi dẫn chiếu code, ghi đủ `đường/dẫn.ts:dòng` để bấm thẳng tới nơi.
- Tài liệu mô tả **hiện trạng**, không mô tả dự định. Việc cần làm nằm ở
  [10-ra-soat-cau-truc.md](10-ra-soat-cau-truc.md).
