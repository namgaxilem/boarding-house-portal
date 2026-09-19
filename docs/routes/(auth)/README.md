[← Bản đồ route](../README.md) · [← Mục lục docs](../../README.md)

# Route group `(auth)` — đăng nhập và khôi phục mật khẩu

| | |
|---|---|
| Layout | `src/app/(auth)/layout.tsx` (21 dòng) |
| Guard | **không có** — ba đường dẫn này nằm trong `PUBLIC_PATHS` của proxy |
| URL | `/login`, `/forgot-password`, `/reset-password` |

Layout rất mỏng: khung hẹp căn giữa + `BrandLockup` + `ThemeToggle`. Không header, không nav —
trang đăng nhập không nên có chỗ nào để bấm nhầm.

## Ai đã đăng nhập mà vào `/login`?

Xử lý **ở trang**, không ở proxy. Lý do ghi trong `src/proxy.ts:68-70`: đá họ "về nhà" cần biết
`role`, và đọc `role` sẽ tốn một round-trip database trên **mọi** request chỉ để phục vụ một
trường hợp hiếm. Nên `login/page.tsx` tự gọi `getCurrentUser()` và chuyển hướng theo
`HOME_PATH[role]`.

## Cờ `?expired=1`

Khi cookie còn hợp lệ về cấu trúc nhưng tài khoản đã bị xoá hoặc khoá, `requireUser()` đá về
`/login?expired=1`. Proxy thấy cờ này thì **xoá sạch cookie `sb-*`** rồi để trang render. Không
có cờ đó, proxy sẽ thấy "đã đăng nhập", đá ngược lại, và hai bên chuyển hướng lẫn nhau vô hạn.

## Đăng nhập mạng xã hội — **hiện đang tắt hết**

```ts
// src/config/site.ts
login: { google: false, facebook: false, zalo: false }
```

Chỉ dùng email + mật khẩu. `/login` không render `SocialButtons`.

| Provider | Đường đi khi bật |
|---|---|
| Google, Facebook | Provider có sẵn của Supabase → `/auth/callback` |
| **Zalo** | **Tự viết** — `/auth/zalo` → Zalo → `/auth/zalo/callback` |

### Bật lại cần đủ ba bước — thiếu bước nào cũng hỏng

Cờ `houseConfig.login` chỉ là **bước 3**: nó quyết định có *hiện nút* hay không, và **không kiểm
tra được** phía Supabase đã bật provider chưa. Bật mình nó là nút hiện ra rồi bấm vào gặp lỗi.

| Bước | Google / Facebook | Zalo |
|---|---|---|
| 1 | `SUPABASE_AUTH_EXTERNAL_<P>_CLIENT_ID` + `_SECRET` | `ZALO_APP_ID` + `ZALO_APP_SECRET` trong `.env.local` |
| 2 | Bật provider: `[auth.external.<p>] enabled = true` (local) **và** bật trên project cloud | — không cần |
| 3 | `houseConfig.login.<p> = true` | `houseConfig.login.zalo = true` |

Lỗi khi thiếu bước 2 **không bắt được trong app**: Supabase từ chối ngay tại `/authorize` và trả
JSON thô `Unsupported provider: provider is not enabled`, trước khi có bất kỳ redirect nào về
`/login?error=…`.

> ⚠️ **Đừng bật bước 2 trên cloud bằng `supabase config push`.** Lệnh đó đẩy toàn bộ khối `[auth]`
> của `config.toml` lên, mà file đó đang khai `site_url = "http://localhost:3000"` và
> `additional_redirect_urls` trỏ localhost — push lên là ghi đè Site URL của project thật, làm
> hỏng link đặt lại mật khẩu trong email và redirect OAuth của bản deploy. Bật tay ở
> **Dashboard → Authentication → Sign In / Providers**, hoặc sửa `site_url` trước.

Redirect URI khai bên console của provider: `https://<project-ref>.supabase.co/auth/v1/callback`
(cloud) hoặc `http://127.0.0.1:54321/auth/v1/callback` (local).

Chi tiết từng bước: [`../../../README.md`](../../../README.md) mục 4.

Chi tiết route handler: [`auth/`](../auth/README.md).

## Trang trong group

| URL | Docs | Dòng |
|---|---|---|
| `/login` | [login](login/README.md) | 60 |
| `/forgot-password` | [forgot-password](forgot-password/README.md) | 33 |
| `/reset-password` | [reset-password](reset-password/README.md) | 31 |
