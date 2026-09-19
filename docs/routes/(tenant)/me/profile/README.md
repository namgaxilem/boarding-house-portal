[← `/me`](../README.md) · [← `(tenant)`](../../README.md) · [← Bản đồ route](../../../README.md) · [← Mục lục docs](../../../../README.md)

# `/me/profile` — Hồ sơ của tôi

| | |
|---|---|
| File | `src/app/(tenant)/me/profile/page.tsx` (151 dòng) |
| Hàm | `MyProfilePage` |
| Guard | `requireUser()` từ layout **+ gọi lại trong trang** |
| Metadata | `export const metadata` tĩnh |

## Dữ liệu

```ts
lib/auth/dal  :: requireUser
lib/db        :: db
lib/constants :: ROLE_LABEL
lib/format    :: initials
config/site   :: houseConfig
```

## Giao diện

```
features/tenants/components/own-profile-form OwnProfileForm      [client]
features/auth/components/password-forms      ChangePasswordForm  [client]
components/ui/{alert,avatar,badge,button,card,skeleton}
components/common/link  Link
```

## Action

| Action | File | Việc |
|---|---|---|
| `updateOwnProfile` | `features/tenants/actions.ts:184` | Tên, điện thoại, liên hệ khẩn cấp |
| `changePassword` | `features/auth/actions.ts:97` | Yêu cầu mật khẩu cũ |

`updateOwnProfile` **khác** `updateTenant`: người thuê chỉ sửa được trường của chính mình, và
không đụng tới `role`, `isActive`, hay số CCCD.

Số CCCD **không sửa ở đây** — nó đến từ hồ sơ giấy tờ đã được chủ trọ duyệt
([`/me/identity`](../identity/README.md)). Sửa tay thì con số trên hồ sơ và con số trên ảnh thẻ
sẽ lệch nhau.

## Ba đường sửa hồ sơ

Xem bảng ở
[`/admin/settings/account`](<../../../(admin)/admin/settings/account/README.md#ba-đường-sửa-hồ-sơ-đừng-nhầm>).
