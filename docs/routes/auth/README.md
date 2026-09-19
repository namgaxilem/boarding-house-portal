[← Bản đồ route](../README.md) · [← Mục lục docs](../../README.md)

# `/auth/*` — Route handler xác thực

Ba handler, chỉ export `GET`, không có giao diện. Tất cả nằm trong `PUBLIC_PREFIXES` của proxy.

```
src/app/auth/
├─ callback/route.ts        (61)   Supabase OAuth / PKCE / link email
└─ zalo/
   ├─ route.ts              (79)   bắt đầu OAuth Zalo
   └─ callback/route.ts    (147)   Zalo trả về
```

---

## `GET /auth/callback` — Supabase

```ts
lib/supabase/server :: createClient
lib/auth/dal        :: getCurrentUser
```

Đích của **mọi** luồng Supabase Auth: Google, Facebook, và link trong email đặt lại mật khẩu.
Đổi mã PKCE lấy session, ghi cookie, rồi điều hướng theo vai trò (`HOME_PATH`) hoặc theo `?next=`.

Link khôi phục mật khẩu cũng đi qua đây trước khi tới
[`/reset-password`](<../(auth)/reset-password/README.md>).

---

## Zalo — tự viết, không phải provider của Supabase

Supabase không hỗ trợ Zalo, nên luồng này dựng tay trong `src/lib/auth/zalo.ts` (171 dòng).

```
/auth/zalo                          /auth/zalo/callback
   │                                        │
   ├─ getZaloCredentials()                  ├─ đọc 3 cookie, so state
   ├─ createState() → cookie                ├─ exchangeCodeForToken()
   ├─ createVerifier() + createChallenge()  ├─ fetchZaloProfile()
   │    (PKCE) → cookie                     ├─ normalizeVietnamesePhone()
   ├─ cookie mode: đăng nhập | liên kết     └─ tạo hoặc liên kết tài khoản
   └─ redirect buildAuthorizeUrl()               (cần service-role key)
```

### Ba cookie

`ZALO_STATE_COOKIE`, `ZALO_VERIFIER_COOKIE`, `ZALO_MODE_COOKIE`.

- **state** chống CSRF — callback từ chối nếu không khớp.
- **verifier** là PKCE.
- **mode** phân biệt *đăng nhập bằng Zalo* với *liên kết Zalo vào tài khoản đang có*. Cùng một
  callback phục vụ hai việc, nên phải mang theo ý định.

Cờ `secure` của cookie đặt theo `NODE_ENV` — local chạy http nên không bật được.

### Ghép tài khoản bằng số điện thoại

Zalo trả số điện thoại; `normalizeVietnamesePhone()` (`lib/auth/zalo.ts:164`) chuẩn hoá về một
dạng để khớp với `profiles.phone`. Không khớp ai thì tạo tài khoản mới.

Tạo/liên kết tài khoản trong Supabase Auth cần `lib/supabase/admin.ts`, tức là
**`SUPABASE_SERVICE_ROLE_KEY`**.

### Chưa cấu hình thì sao

`getZaloCredentials()` không thấy `ZALO_APP_ID` / `ZALO_APP_SECRET` → redirect
`/login?error=…`. Nút Zalo chỉ nên bật trong `houseConfig.login` **sau khi** đã điền env.

Redirect URI dựng từ `NEXT_PUBLIC_SITE_URL` — sai biến này thì Zalo từ chối vì URI không khớp
đăng ký.

---

## Google / Facebook

Không có route riêng: `signInWithGoogle` / `signInWithFacebook`
(`features/auth/oauth-actions.ts`) gọi Supabase, Supabase chuyển hướng, rồi quay về
`/auth/callback`.

Client id/secret của hai provider này nằm ở `supabase/config.toml` qua `env(...)`, và CLI đọc
từ **`.env`, không phải `.env.local`** — xem [08-cau-hinh.md](../../08-cau-hinh.md#khai-trong-envexample-nhưng-app-không-đọc).
