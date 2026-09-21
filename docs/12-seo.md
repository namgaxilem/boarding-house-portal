# 12 — SEO & dữ liệu có cấu trúc

App này có hai loại trang, và chúng cần hai thứ ngược nhau:

- **Ba trang công khai** (`/`, `/rooms`, `/contact`) là công cụ cho thuê phòng. Chúng phải lên
  Google, phải hiện đẹp khi dán link vào Zalo, phải nói rõ giá và địa chỉ.
- **Mọi trang còn lại** giữ hoá đơn, số CCCD, mật khẩu wifi. Chúng phải **không** lên Google.

Tài liệu này mô tả cách hai yêu cầu đó cùng tồn tại mà không ai phải nhớ khai gì.

---

## 1. Nguyên tắc: cấm trước, mở sau

`src/app/layout.tsx` đặt `robots: noIndex` cho **toàn site**. Đúng một chỗ mở lại:
`(marketing)/layout.tsx` khai `robots: indexable`.

```
src/app/layout.tsx              robots: noIndex          ← mặc định toàn site
└─ (marketing)/layout.tsx       robots: indexable        ← chỉ nhánh này
   ├─ page.tsx                  /
   ├─ rooms/page.tsx            /rooms
   └─ contact/page.tsx          /contact
└─ (auth)/ (tenant)/ (admin)/   thừa hưởng noIndex
```

Chiều này là cố ý. Thêm một trang riêng tư mới mà quên khai gì thì nó **im lặng nằm ngoài**
Google — chứ không im lặng lọt vào. Chiều ngược lại (mặc định cho phép, chặn từng chỗ) hỏng ở
đúng cái ngày ai đó thêm route mới lúc 11 giờ đêm.

Mở ở **layout** chứ không ở từng trang: thêm trang giới thiệu mới dưới `(marketing)/` là nó tự
được lập chỉ mục.

> Trước đợt này, layout gốc khai `robots: { index: false, follow: false }` và **không có gì mở
> lại** — cả site nằm ngoài Google, kể cả trang cho thuê phòng.

---

## 2. Ba mảnh và việc của từng mảnh

| Mảnh | File | Việc |
|---|---|---|
| Metadata từng trang | `src/lib/seo.ts` (148) | `pageMeta()` — title, description, canonical, `og:*`, `twitter:*`, ảnh xem trước |
| Dữ liệu có cấu trúc | `src/lib/structured-data.ts` (206) | JSON-LD schema.org: nhà trọ, danh sách phòng kèm giá, đường dẫn phân cấp |
| Thẻ nhúng JSON-LD | `src/components/common/json-ld.tsx` (26) | `<script type="application/ld+json">`, có escape |
| Sitemap | `src/app/sitemap.ts` (30) | `/sitemap.xml` — 3 URL công khai |
| robots.txt | `src/app/robots.ts` (35) | `/robots.txt` — chặn khu sau đăng nhập, trỏ sitemap |

### Khác nhau giữa Open Graph và JSON-LD

Hay bị gộp làm một, nhưng chúng phục vụ hai bên khác nhau:

- **Open Graph** nói cho **Zalo/Facebook/Messenger** biết cách **vẽ** thẻ xem trước khi ai đó
  dán link. Ảnh, tiêu đề, mô tả.
- **JSON-LD** nói cho **Google** biết trang này **là cái gì**. Đây mới là thứ đưa giá thuê, địa
  chỉ, số điện thoại và giờ mở cửa lên thẳng trang kết quả tìm kiếm.

Thiếu OG thì link chia sẻ trông như rác. Thiếu JSON-LD thì kết quả tìm kiếm trơ chữ. Cần cả hai.

---

## 3. `pageMeta()` — metadata một trang

```ts
export const metadata = pageMeta({
  title: "Phòng trống",          // KHÔNG kèm tên nhà trọ, template tự nối
  description: "…",              // ≤155 ký tự, dùng clampDescription() nếu dài
  path: "/rooms",                // canonical + og:url; bỏ trống ở route động
});
```

Sinh ra: `<title>`, `meta[description]`, `link[canonical]`, `og:title/description/url/site_name/
locale/type/image`, `twitter:card/title/description/image`.

### Ba cái bẫy đã gỡ trong hàm này

**1. `openGraph` KHÔNG được trộn giữa các segment — nó bị thay thế.**
Next có quy ước tự động: đặt `src/app/opengraph-image.png` là mọi route được gắn `og:image`,
không phải khai gì. Quy ước đó gắn ảnh ở **từng segment**, và `openGraph` của segment con **thay
thế nguyên khối** của cha (`mergeStaticMetadata` trong `next/dist/lib/metadata/resolve-metadata.js`
chỉ trộn ảnh file-convention khi segment đó chưa tự khai `images`). Nên ngay khi một trang khai
`openGraph` để có `og:title` riêng, ảnh mà layout gốc nhận được **biến mất** — thẻ chia sẻ trơ
chữ, không ảnh, và không có cảnh báo nào.

`pageMeta()` gắn lại ảnh ở mỗi trang (`defaultOgImage`), trỏ đúng vào route mà quy ước kia sinh
ra từ `src/app/opengraph-image.png`. Không phải file thứ hai, không có gì phải đồng bộ.

**2. `og:title` bị nối hậu tố hai lần.**
Layout gốc có `title.template = "%s · Nhà trọ 1-47"`, và Next áp template đó lên cả
`openGraph.title` khi nó là chuỗi thường → `Phòng trống · Nhà trọ 1-47 · Nhà trọ 1-47`.
Dùng dạng `{ absolute: fullTitle }` để bỏ qua template.

**3. Canonical ở route động là canonical SAI.**
`path` là tuỳ chọn. Route như `/me/invoices/[invoiceId]` bỏ trống — một canonical trỏ vào đường
dẫn khuôn mẫu sẽ gộp mọi hoá đơn thành cùng một URL. Những trang đó `noindex` sẵn nên không cần.

### `metadataBase`

`metadataBase` (từ `env.siteUrl`) là gốc để mọi URL tương đối trong metadata thành URL tuyệt đối.
Thiếu nó thì `next build` cảnh báo rồi tự điền `http://localhost:3000`, và link chia sẻ ra ngoài
mất ảnh. Xem [10-ra-soat-cau-truc.md §4.12](10-ra-soat-cau-truc.md).

---

## 4. JSON-LD

Ba khối, gắn ở ba chỗ khác nhau:

| Khối | Gắn ở | Nội dung |
|---|---|---|
| `LodgingBusiness` | `(marketing)/layout.tsx` | Tên, mô tả, địa chỉ, điện thoại, email, giờ mở cửa, 6 tiện ích, link Google Maps |
| `ItemList` → `Accommodation` + `Offer` | `rooms/page.tsx`, trong `<Suspense>` | 11 phòng: giá/tháng, diện tích (m²), số người tối đa, tầng, ảnh |
| `BreadcrumbList` | `rooms/page.tsx`, `contact/page.tsx` | "Trang chủ › Phòng trống" thay cho URL trần |

`LodgingBusiness` lặp trên cả ba trang là **đúng** với schema.org: cùng một `@id` thì Google hiểu
là cùng một thực thể, không phải ba nhà trọ. `Offer.seller` trỏ về `@id` đó.

### Nguyên tắc: KHÔNG BỊA

Mọi giá trị đọc từ `houseConfig` hoặc database. Google phạt dữ liệu có cấu trúc sai lệch **nặng
hơn** là không có. Ba trường cố ý vắng mặt:

- **`geo` (toạ độ)** — `houseConfig.address.mapUrl` là link rút gọn, không chứa lat/lng.
- **`aggregateRating`** — app không có hệ thống đánh giá. Tự khai sao là vi phạm chính sách và bị
  gỡ **toàn bộ** rich result, không chỉ phần sao.
- **`openingHoursSpecification` khi lịch không chắc chắn** — `contact.officeHours` là chữ tự do.
  Hàm `openingHours()` chỉ nhận đúng một dạng: có khoảng `HH:MM–HH:MM` **và** có chữ "hàng ngày".
  Đổi sang "Thứ 2 – Thứ 6" thì khối biến mất, thay vì thành `Mo-Su` sai.

### `Offer` phải nói rõ "mỗi tháng"

```json
"priceSpecification": {
  "@type": "UnitPriceSpecification",
  "price": 2400000, "priceCurrency": "VND",
  "unitCode": "MON", "unitText": "tháng"
}
```

Thiếu khối này thì Google đọc `2.400.000 ₫` là giá **bán đứt** căn phòng.
`floorSize.unitCode` là `MTK` (mét vuông theo UN/CEFACT) — schema.org không nhận chữ `m2`.

### Escape trong `<JsonLd>`

`JSON.stringify(data).replace(/</g, "\\u003c")`. Mô tả phòng do chủ trọ nhập; một chuỗi chứa
`</script>` sẽ đóng sớm thẻ script rồi biến phần còn lại thành HTML thật — XSS lưu trữ.
`<` vẫn là JSON hợp lệ.

Không dùng `next/script`: dữ liệu phải nằm sẵn trong HTML đầu tiên bot tải về.

---

## 5. Sitemap và robots.txt

### Ba chỗ phải khớp nhau

Thêm một trang công khai mới thì sửa **cả ba**, lệch nhau là hỏng lặng lẽ:

1. `PUBLIC_PATHS` trong `src/proxy.ts` — thiếu thì bot chưa đăng nhập bị đẩy sang `/login`, và
   Google lập chỉ mục trang đăng nhập.
2. `src/app/sitemap.ts` — thêm đường dẫn.
3. Đặt trang dưới `(marketing)/` để thừa hưởng `robots: indexable`.

> ⚠️ **Đường dẫn có phần ĐỘNG cần `PUBLIC_PATH_PREFIXES`, không phải `PUBLIC_PREFIXES`.**
> `PUBLIC_PATHS` là `Set` khớp chính xác nên `/blog/<slug>` trượt qua nó. Nhưng đừng thêm vào
> `PUBLIC_PREFIXES`: nhánh đó return sớm và **bỏ qua `updateSupabaseSession()`**, nên phiên của
> người đã đăng nhập ngừng xoay vòng trong lúc họ đọc bài. Xem
> [13-bai-viet.md §7](13-bai-viet.md).

### Matcher của proxy phải loại trừ `.xml` và `.txt`

```ts
"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|…|webmanifest|xml|txt)$).*)"
```

`/sitemap.xml` và `/robots.txt` được bot tải mà **không bao giờ** có phiên đăng nhập. Đi qua proxy
thì cả hai bị chuyển hướng 307 sang `/login` — Googlebot đọc được một trang đăng nhập thay vì
sitemap, và **không có gì báo lỗi**. Cùng lý do đã thêm `js|wasm|webmanifest` cho PWA.

### Sitemap: trang tĩnh không có `lastModified`, bài viết thì có

Bốn đường dẫn tĩnh (`/`, `/rooms`, `/contact`, `/blog`) không khai `lastModified`, vì hai lý do:

1. `changeFrequency` và `priority` bị Google bỏ qua hoàn toàn; `lastModified` chỉ được tin khi nó
   chính xác — một mốc đổi theo mỗi lần deploy thì tệ hơn là không có.
2. `cacheComponents: true` prerender route này, và `new Date()` lúc prerender ném thẳng
   `"encountered the unstable value Date.now()"`.

**Từng bài viết thì CÓ khai**, và điều đó không mâu thuẫn: giá trị dùng là
`new Date(post.updatedAt)` — dựng từ một chuỗi đã lưu trong database, tức là một mốc sửa nội dung
thật. Chốt chặn của `cacheComponents` bắt **thời gian hiện tại**, không bắt việc dựng một `Date` từ
giá trị có sẵn. Phần đọc database nằm sau `"use cache"` nên route vẫn prerender được; xem
[13-bai-viet.md §4](13-bai-viet.md).

### Hai tầng chặn khác nhau

| | Làm gì | Không làm gì |
|---|---|---|
| `robots.txt` | "Đừng **tải** những đường dẫn này" — tiết kiệm lượt bò | Không chặn lập chỉ mục. URL bị disallow mà có người dẫn link vẫn có thể hiện dạng trơ |
| `robots: noIndex` | "Đừng **đưa vào** chỉ mục" — chặn thật | — |

Cần cả hai. Chặn trong robots.txt vô hại vì `/admin`, `/me`, `/api`, `/auth` đều nằm sau đăng
nhập: bot có tải cũng chỉ nhận trang `/login`.

---

## 6. Cấu trúc tiêu đề

Mỗi trang đúng **một** `<h1>`, và không nhảy cấp:

| Trang | h1 | h2 | h3 |
|---|---|---|---|
| `/` | Khẩu hiệu | Tiện ích · Muốn xem phòng · Phòng đang trống | Tên từng phòng |
| `/rooms` | Phòng đang trống | Tên từng phòng (×11) | — |
| `/contact` | Liên hệ | Chủ trọ · Địa chỉ · Chuyển khoản | — |

Trước đợt này: `/rooms` có **0** `<h2>` (tên phòng là `<span>`), `/contact` nhảy thẳng h1 → h3
(`CardTitle` cứng là `h3`). `CardTitle` giờ nhận prop `as` để đổi **cấp** mà không đổi cỡ chữ.

Tiêu đề trang chủ là **khẩu hiệu**, không phải tên nhà trọ: người ta gõ "phòng trọ bình thạnh",
không gõ "nhà trọ 1-47" — họ chưa biết nhà trọ này tồn tại.

---

## 7. Hiệu năng ảnh hưởng xếp hạng

`priority` đặt trên **ảnh phòng đầu tiên** của `/` và `/rooms` — gần như luôn là LCP của trang.
Để `loading="lazy"` mặc định thì trình duyệt phải dựng xong bố cục mới biết cần tải nó, LCP trễ
một vòng, và LCP là tín hiệu xếp hạng. Chỉ tấm **đầu**: đánh dấu cả lưới thì mất hết ý nghĩa.

Kiểm chứng: `<link rel="preload" as="image">` xuất hiện trong `<head>`, và ảnh đầu **không** có
`loading="lazy"`.

---

## 8. Biến môi trường

| Biến | Thiếu thì sao |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | **Bắt buộc khi deploy.** `metadataBase`, canonical, `og:image`, dòng `Sitemap:` trong robots.txt đều dựng từ đây. Trống → mọi URL tuyệt đối trỏ `http://localhost:3000`, thẻ xem trước mất ảnh |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Thẻ xác minh không được chèn → không mở được Search Console → không nộp được sitemap, không biết Google lập chỉ mục trang nào. Lấy mã: Search Console → Add property → HTML tag |

---

## 9. Đo được gì

Lighthouse (mobile, bản production, 2026-09-20):

| Trang | SEO | Trợ năng | Best Practices | Audit hỏng |
|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 0 |
| `/rooms` | 100 | 100 | 100 | 0 |

Kiểm nhanh sau khi deploy:

```bash
curl -s https://<domain>/robots.txt
curl -s https://<domain>/sitemap.xml
curl -s https://<domain>/rooms | grep -o '<meta property="og:[^>]*>'
curl -s https://<domain>/rooms | grep -c '<script type="application/ld+json">'   # phải là 3
```

Công cụ của Google:
- [Rich Results Test](https://search.google.com/test/rich-results) — dán URL `/rooms`, phải thấy
  `LodgingBusiness`, `ItemList`, `BreadcrumbList` và không có lỗi.
- [Search Console](https://search.google.com/search-console) — nộp sitemap, theo dõi trang nào đã
  được lập chỉ mục.

---

## 10. Còn thiếu

Xếp theo giá trị, cao xuống thấp.

> ✅ Từ đợt bài viết, `/blog` và từng `/blog/<slug>` đã vào sitemap — xem
> [13-bai-viet.md](13-bai-viet.md). Mục 10.1 dưới đây vẫn đúng: phòng vẫn chưa có trang riêng.

### 10.1 Chưa có trang riêng cho từng phòng

Cả site chỉ có **3 URL** tĩnh được lập chỉ mục (cộng với bài viết). `/rooms` là một danh sách; không có `/rooms/<mã>`.

Hệ quả: mọi phòng cạnh tranh nhau trên đúng một trang, và không phòng nào có đủ nội dung riêng để
lên kết quả cho truy vấn cụ thể ("phòng trọ 20m2 có gác Bình Thạnh"). Có trang riêng thì 11 phòng
thành 11 URL, mỗi trang mang ảnh riêng, mô tả riêng, `Accommodation` riêng — và `sitemap.ts` sinh
động từ database.

Đây là khoảng trống SEO lớn nhất còn lại. Nó là việc **thêm route**, không phải chỉnh metadata.

### 10.2 Ảnh chia sẻ là logo, không phải ảnh phòng

`og:image` hiện là tấm logo trên nền kem. Đúng cho `/` và `/contact`, nhưng `/rooms` dán vào Zalo
mà hiện ảnh phòng thật sẽ được bấm nhiều hơn hẳn.

Cách làm: `opengraph-image.tsx` (ImageResponse) ở `rooms/`, ghép ảnh phòng bìa + giá + diện tích.
Vướng: route đó phải đọc database, tức là thành dynamic dưới `cacheComponents`.

### 10.3 Chưa có toạ độ trong `houseConfig`

Thêm `lat`/`lng` vào `houseConfig.address` là mở được `geo` trong `LodgingBusiness` — tín hiệu
mạnh cho kết quả bản đồ địa phương. Lấy từ Google Maps: bấm chuột phải vào điểm → toạ độ.

### 10.4 Image sitemap

Sitemap chưa liệt kê 19 ảnh phòng. Thêm `images: [...]` cho URL `/rooms` là chúng vào được Google
Hình ảnh. Vướng giống 10.2: phải đọc database trong `sitemap.ts`.

### 10.5 Từ khoá chưa được chọn

Tiêu đề hiện dựng từ `houseConfig`. `/rooms` là "Phòng trống · Nhà trọ 1-47" — đúng nhưng không
có từ khoá địa phương nào. Chọn từ khoá là việc của chủ trọ, không phải việc đoán:

- `houseConfig.address.ward` = "Phường Bình Lợi Trung" (tên sau sáp nhập, ít người tìm)
- README trong thư mục ảnh ghi "phường 13, quận Bình Thạnh" (tên cũ, nhiều người tìm)
- Mốc gần: "gần Đại học Văn Lang 400m", "đường Phạm Văn Đồng"

Hai nguồn đang **lệch nhau**, và không nên tự chọn hộ.

---

Quay lại [mục lục](README.md).
