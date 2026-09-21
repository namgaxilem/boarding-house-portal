[← Mục lục](README.md)

# 11 — Tính năng chưa làm & giới hạn đã biết

Danh sách này gom từ ba nguồn: mục 15 của [`../README.md`](../README.md) (chủ dự án tự khai),
code đọc được, và kết quả chạy thử. Mỗi dòng ghi rõ **đã kiểm chứng bằng cách nào**.

Trạng thái hiện tại: dev server chạy, 102/102 test xanh, lint sạch, build qua sau khi dọn
`.next/dev`. Không có tính năng nào đang hỏng khi dùng — phần dưới là thứ *chưa có*, không phải
thứ *đang vỡ*, trừ hai mục ở [§0](#0).

<a id="0"></a>

## 0. Phải sửa trước — đang chặn đường

| Việc | Ảnh hưởng | Chi tiết |
|---|---|---|
| **Open redirect ở `/login`** | `?next=/\evil.com` qua được guard → đẩy người vừa đăng nhập sang tên miền lạ | [10 §4.13](10-ra-soat-cau-truc.md#413) |
| `typecheck` chưa chạy `next typegen` | **CI đỏ ở mọi push** | [10 §4.11](10-ra-soat-cau-truc.md#411) |
| `tsconfig.include` kéo `.next/dev/types` | **`next build` hỏng sau mỗi lần `next dev`** | [10 §4.11](10-ra-soat-cau-truc.md#411) |
| Thiếu `metadataBase` | Ảnh xem trước khi chia sẻ link trỏ `localhost` | [10 §4.12](10-ra-soat-cau-truc.md#412) |

Cả ba đều sửa dưới 10 dòng.

---

## 1. Cổng TTLock — nửa đường, khối lớn nhất

Đây là khoảng trống lớn nhất: **~1.150 dòng TypeScript + 379 dòng SQL đã viết mà chưa có đường
chạy tới.**

| Đã có | Chưa có |
|---|---|
| `src/lib/gate.ts` (417) — sinh mã, đặt tên mã, cửa sổ hiệu lực, kế hoạch đồng bộ | **Tầng HTTP gọi API TTLock** |
| `gate.test.ts` (353) — 33 test xanh | Job đồng bộ (cấp mã, gia hạn, thu hồi) |
| Bảng `gate_locks`, `gate_credentials` — đang dùng thật | 4 bảng `gate_passcodes`, `gate_fingerprints`, `gate_events`, `integration_tokens` — **0 truy vấn** |
| `/admin/gate` — hiện checklist thiết lập | Màn hình thao tác thật |
| 4 biến `TTLOCK_*` trong `lib/env.ts` | `TTLOCK_API_BASE` khai ở `.env.example` nhưng **không code nào đọc** |

Kiểm chứng: `fetch()` trong toàn bộ `src/` chỉ có ở `lib/auth/zalo.ts` (2 lần) và `lib/email.ts`
(1 lần) — không lời gọi TTLock nào tồn tại.

**Quyết định cần ra:** viết tiếp tầng HTTP, hay gỡ `lib/gate.ts` + test + 8 type + 4 bảng sang
nhánh riêng. Để nguyên như hiện tại là trạng thái tệ nhất — người đọc code tưởng cổng đã chạy.

Chi tiết: [routes/(admin)/admin/gate](<routes/(admin)/admin/gate/README.md>) ·
[10 §4.2](10-ra-soat-cau-truc.md#42)

---

## 2. Chủ dự án đã liệt kê (README mục 15)

| Tính năng | Ghi chú |
|---|---|
| **Thông báo đẩy iOS/Android** | Đã kiểm: `grep -riE "webpush\|pushManager\|PushSubscription" src/ public/sw.js` → **0 kết quả**. `sw.js` hiện chỉ cache asset tĩnh, không có handler `push` |
| **SMS** | Chưa có. README ghi rõ ✅ in-app + ✅ email, ❌ SMS, ❌ push |
| **Lưu ảnh hợp đồng** | Chưa có bucket, chưa có bảng. Bốn bucket hiện tại: `room-photos`, `id-photos`, `payment-qr`, `maintenance-photos` |
| **Tính tiền theo ngày (prorate)** | Đã kiểm: `grep -riE "prorate\|tính theo ngày" src/` → 0 kết quả. Người vào giữa tháng hiện vẫn tính tròn tháng |
| **Xuất hoá đơn ra CSV** | Đã kiểm: `grep -riE "csv\|xlsx" src/` → 0 kết quả |

Trong năm cái này, **prorate** là cái đụng tới tiền thật — người vào ngày 20 vẫn bị tính đủ
tháng. Đáng xếp cao hơn bốn cái còn lại.

---

## 3. Bảo mật — một khoảng trống đã biết

**Chưa có CSP đầy đủ.** Header hiện chỉ khai `frame-ancestors 'none'`
(`next.config.ts:122`). README mục 15 ghi lý do: CSP đúng cần nonce sinh theo từng request trong
`proxy.ts`, vì Next chèn script inline cho streaming và hydrate; một CSP tĩnh kèm
`'unsafe-inline'` chỉ để trang trí.

Bốn header còn lại đã có đủ: `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`,
`Permissions-Policy`.

---

## 4. Giới hạn về quy mô — không phải lỗi, nhưng nên biết

Repo được thiết kế cho **một nhà trọ 10 phòng**, và nhiều lựa chọn chỉ đúng ở quy mô đó.

| Giới hạn | Bằng chứng | Chạm trần khi nào |
|---|---|---|
| **Không có phân trang** | 4 lần `.limit(1)` trong adapter đều là kiểu "lấy bản mới nhất", không phải phân trang. Mọi danh sách tải hết | Vài trăm hoá đơn / phiếu báo hỏng |
| **Không có tìm kiếm** | Lọc theo trạng thái thì có; ô tìm theo tên/mã thì không | Trên ~30 người thuê |
| **Cấu hình nhà trọ nằm trong code** | `src/config/site.ts`, cố ý không có bảng `settings` | Khi quản nhiều hơn một nhà trọ |
| **Một nhà trọ mỗi lần deploy** | Không có khái niệm `house_id` ở đâu trong lược đồ | Ngay khi có nhà trọ thứ hai |
| **Nhật ký thao tác của admin — một phần** | `admin_audit_log` ghi MỌI lời gọi của trợ lý Telegram (kể cả lần đọc); Server Action trên web thì vẫn chưa ghi. Xem [14](14-tro-ly-telegram.md) | Khi có nhiều hơn một người quản trị |
| **Gói free Supabase** | 1GB Storage, 5GB băng thông/tháng; hạn mức ảnh siết ở `lib/upload-policy.ts` | Đã được tính trước, xem [04](04-tang-du-lieu.md#nén-ảnh-trước-khi-tải-lên) |

Không cái nào cần sửa **bây giờ**. Chúng là ranh giới của thiết kế, và thiết kế đó phù hợp với
bài toán đang giải.

---

## 5. Đã cân nhắc rồi loại bỏ — đừng thêm lại

| Thứ | Vì sao bỏ |
|---|---|
| **Chat trong app** | Nhà trọ 10 phòng đã có Zalo và số chủ trọ. Thêm hộp chat = thêm một nơi nữa phải kiểm tin nhắn, mà việc gấp thì người ta vẫn gọi điện. Báo hỏng **khác** và đã làm: nó là việc *chưa xong* có trạng thái, và dính vào phòng để tra lịch sử |
| **Mã cổng / vân tay cho người thuê xem** | Người thuê bấm mã đó hằng ngày; người cần tra "ngăn vân tay số 3 là của ai" là chủ trọ. Để riêng bảng `gate_credentials` vì **RLS lọc dòng, không lọc cột** — thêm cột vào `profiles` là người thuê đọc được ngay bằng một lệnh gọi API |
| **Sinh mã VietQR** | Thay bằng tải ảnh QR lên — chủ trọ tự chụp từ app ngân hàng, không phải tin vào thư viện sinh mã |
| **`experimental.useOffline`** | Giữ request thất bại ở trạng thái chờ rồi tự chạy lại; giao diện khi đó đứng im, không phân biệt được với treo, và người dùng không huỷ được |
| **Service worker chạy offline thật** | App bắt buộc có mạng. Mất mạng thì trình duyệt hiện lỗi của chính nó — trung thực hơn một trang giả vờ. SW chỉ tồn tại để Chrome Android bắn `beforeinstallprompt` |

Ghi ở đây để lần sau có người hỏi "sao không có chat?" thì đã có câu trả lời, kèm lý do.

---

## 6. Đề xuất thứ tự

| # | Việc | Vì sao |
|---|---|---|
| 1 | Bốn mục ở [§0](#0) | Open redirect đang khai thác được; CI đỏ; build hỏng. Tổng dưới 40 dòng |
| 2 | Quyết định về TTLock ([§1](#1-cổng-ttlock--nửa-đường-khối-lớn-nhất)) | Khối chết lớn nhất, và là quyết định chứ không phải code |
| 3 | Prorate tháng đầu/cuối | Cái duy nhất trong README §15 đụng tới tiền thật |
| 4 | Xuất CSV | Rẻ, và là thứ kế toán hỏi đầu tiên |
| 5 | Lưu ảnh hợp đồng | Hạ tầng upload đã có sẵn, thêm bucket thứ năm |
| 6 | Push / SMS | Đắt nhất, lợi ích thấp nhất khi email + in-app đã chạy |
| 7 | CSP đầy đủ với nonce | Cần đụng `proxy.ts`, làm khi có thời gian yên tĩnh |
