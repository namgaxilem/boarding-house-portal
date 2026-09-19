[← `(auth)`](../README.md) · [← Bản đồ route](../../README.md) · [← Mục lục docs](../../../README.md)

# `/reset-password` — Đặt mật khẩu mới

| | |
|---|---|
| File | `src/app/(auth)/reset-password/page.tsx` (31 dòng) |
| Hàm | `ResetPasswordPage` |
| Guard | không — quyền đến từ phiên khôi phục do Supabase cấp |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Đích của link trong email khôi phục. Người dùng tới đây **đã có một phiên tạm** do Supabase
Auth cấp qua `/auth/callback`; trang chỉ thu mật khẩu mới.

## Giao diện

```
components/common/link                   Link
components/ui/card                       Card, CardContent, CardDescription, CardHeader, CardTitle
features/auth/components/password-forms  ResetPasswordForm   [client]
```

Cùng file component với [`/forgot-password`](../forgot-password/README.md) — `password-forms.tsx`
export cả `ForgotPasswordForm`, `ResetPasswordForm` và `ChangePasswordForm`.

## Action

`resetPassword` — `features/auth/actions.ts`.

Khác với `changePassword` (dùng ở [`/me/profile`](<../../(tenant)/me/profile/README.md>) và
[`/admin/settings/account`](<../../(admin)/admin/settings/account/README.md>)): bản đó yêu cầu
nhập mật khẩu cũ, bản này không, vì quyền đến từ link email.

## Đi tiếp

- [`/login`](../login/README.md)
