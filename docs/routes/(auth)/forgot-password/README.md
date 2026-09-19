[← `(auth)`](../README.md) · [← Bản đồ route](../../README.md) · [← Mục lục docs](../../../README.md)

# `/forgot-password` — Yêu cầu đặt lại mật khẩu

| | |
|---|---|
| File | `src/app/(auth)/forgot-password/page.tsx` (33 dòng) |
| Hàm | `ForgotPasswordPage` |
| Guard | không |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Một ô email. Gửi đi thì Supabase Auth phát email chứa link đặt lại, trỏ về
[`/reset-password`](../reset-password/README.md).

## Giao diện

```
components/common/link                   Link
components/ui/card                       Card, CardContent, CardDescription, CardHeader, CardTitle
features/auth/components/password-forms  ForgotPasswordForm   [client]
```

## Action

`requestPasswordReset` — `features/auth/actions.ts`.

## Phụ thuộc cấu hình

Link trong email dựng từ `NEXT_PUBLIC_SITE_URL` (mặc định `http://localhost:3000`). Sai biến
này thì email vẫn gửi nhưng link trỏ về sai host.

Email do **Supabase Auth** gửi, không phải qua Resend. `RESEND_API_KEY` chỉ dùng cho thông báo
hoá đơn / báo hỏng — xem [04-tang-du-lieu.md](../../../04-tang-du-lieu.md#thông-báo).

Ở stack local, email không đi ra ngoài mà rơi vào **Mailpit** ở cổng 54324.

## Đi tiếp

- [`/login`](../login/README.md)
- [`/reset-password`](../reset-password/README.md)
