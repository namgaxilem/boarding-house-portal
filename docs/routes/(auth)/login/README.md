[← `(auth)`](../README.md) · [← Bản đồ route](../../README.md) · [← Mục lục docs](../../../README.md)

# `/login` — Đăng nhập

| | |
|---|---|
| File | `src/app/(auth)/login/page.tsx` (60 dòng) |
| Hàm | `LoginPage` |
| Guard | không — nhưng **tự đá người đã đăng nhập đi chỗ khác** |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

```ts
lib/auth/dal   :: getCurrentUser
lib/constants  :: HOME_PATH
```

Trang gọi `getCurrentUser()`; nếu đã có phiên thì `redirect(HOME_PATH[role])` —
`/admin` cho chủ trọ, `/me` cho người thuê.

Việc này nằm ở trang chứ không ở proxy, vì proxy sẽ phải đọc `role` từ database trên **mọi**
request chỉ để phục vụ trường hợp hiếm này. Xem [`(auth)`](../README.md#ai-đã-đăng-nhập-mà-vào-login).

## Giao diện

```
components/ui/card                      Card, CardContent, CardDescription, CardHeader, CardTitle
components/ui/alert                     Alert, AlertDescription     ← hiện ?error= và ?expired=
features/auth/components/login-form     LoginForm       [client]
features/auth/components/social-buttons SocialButtons   [client]   ← hiện KHÔNG render
```

`SocialButtons` tự ẩn khi cả ba cờ `houseConfig.login` đều `false` — đó là trạng thái hiện tại,
nên trang chỉ còn form email + mật khẩu và link "Quên mật khẩu?". Xem
[`(auth)`](../README.md#đăng-nhập-mạng-xã-hội--hiện-đang-tắt-hết).

## Query string trang này hiểu

| Tham số | Ai đặt | Ý nghĩa |
|---|---|---|
| `?next=<path>` | `src/proxy.ts` khi chặn khách chưa đăng nhập | Đăng nhập xong quay lại đúng trang đó |
| `?expired=1` | `requireUser()` trong `lib/auth/dal.ts` | Tài khoản đã bị xoá/khoá. Proxy xoá cookie `sb-*` khi thấy cờ này |
| `?error=<mã>` | `/auth/zalo`, `/auth/zalo/callback` | OAuth hỏng hoặc chưa cấu hình |

## Action liên quan

| Action | File |
|---|---|
| `signIn` | `features/auth/actions.ts` |
| `signInWithGoogle` / `signInWithFacebook` / `signInWithZalo` | `features/auth/oauth-actions.ts` |

`safeNext()` quyết định đích đến sau đăng nhập: nhận `?next=` nếu là đường dẫn nội bộ
(`startsWith("/")` và `!startsWith("//")`), ngược lại rơi về `HOME_PATH[role]`.

> 🔴 **`safeNext()` đang thủng.** Guard `startsWith("/") && !startsWith("//")` chặn `//evil.com`
> nhưng cho qua `/\evil.com`, `/<tab>/evil.com`, `/<newline>//evil.com` — cả ba phân giải thành
> `http://evil.com/`. Khai thác được ở `actions.ts:55` vì nó `redirect()` bằng đường dẫn tương
> đối. `?next=` đi từ query string tới đó **không qua bước lọc nào**: `login/page.tsx:28` nhận
> nguyên, `loginSchema` khai `next: z.string().optional()`, rồi vào thẳng `redirect()`.
> Chi tiết + cách vá: [10 §4.13](../../../10-ra-soat-cau-truc.md#413).

## Đi tiếp

- [`/forgot-password`](../forgot-password/README.md)
- Route handler OAuth: [`auth/`](../../auth/README.md)
