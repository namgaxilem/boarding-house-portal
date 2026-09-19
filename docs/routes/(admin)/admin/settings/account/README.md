[← `/admin/settings`](../README.md) · [← `/admin`](../../README.md) · [← Bản đồ route](../../../../README.md) · [← Mục lục docs](../../../../../README.md)

# `/admin/settings/account` — Tài khoản chủ trọ

| | |
|---|---|
| File | `src/app/(admin)/admin/settings/account/page.tsx` (72 dòng) |
| Hàm | `AccountSettingsPage` |
| Guard | `requireAdmin()` từ layout **+ gọi lại trong trang** (cần đối tượng user) |
| Metadata | `export const metadata` tĩnh |

## Việc của trang

Hồ sơ và mật khẩu của **chính chủ trọ** — không phải của người thuê.

## Dữ liệu

```ts
lib/auth/dal  :: requireAdmin      // trả SessionUser để đổ vào form
lib/constants :: ROLE_LABEL
```

## Giao diện

```
features/auth/components/account-form    AccountForm         [client]
features/auth/components/password-forms  ChangePasswordForm  [client]
components/ui/badge  Badge     ← hiện ROLE_LABEL[role]
components/ui/card   Card, CardContent, CardDescription, CardHeader, CardTitle
```

## Action

| Action | File | Việc |
|---|---|---|
| `updateAccount` | `features/auth/actions.ts:143` | Tên, email |
| `changePassword` | `features/auth/actions.ts:97` | **Yêu cầu mật khẩu cũ** |

## Ba đường sửa hồ sơ, đừng nhầm

| Ai sửa gì | Trang | Action |
|---|---|---|
| Chủ trọ sửa hồ sơ của mình | trang này | `updateAccount` |
| Chủ trọ sửa hồ sơ người thuê | [`/admin/tenants/[tenantId]/edit`](<../../tenants/[tenantId]/edit/README.md>) | `updateTenant` |
| Người thuê sửa hồ sơ của mình | [`/me/profile`](<../../../../(tenant)/me/profile/README.md>) | `updateOwnProfile` |

Đổi mật khẩu cũng chia ba: `changePassword` (biết mật khẩu cũ), `resetPassword` (qua link email,
xem [`/reset-password`](<../../../../(auth)/reset-password/README.md>)), và `resetTenantPassword`
(chủ trọ đặt hộ người thuê, cần service-role key).
