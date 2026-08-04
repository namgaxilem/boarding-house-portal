import { Button } from "@/components/ui/button";
import { houseConfig } from "@/config/site";

import {
  signInWithFacebook,
  signInWithGoogle,
  signInWithZalo,
} from "@/features/auth/oauth-actions";

/**
 * Nút đăng nhập mạng xã hội.
 *
 * Là Server Component: chỉ đọc `houseConfig.login` để biết nút nào hiện. Mỗi nút
 * là một form POST thật, nên bấm được cả khi JavaScript chưa tải xong.
 */
export function SocialButtons({ next }: { next?: string }) {
  const { google, facebook, zalo } = houseConfig.login;

  if (!google && !facebook && !zalo) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">hoặc đăng nhập bằng</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        {google && (
          <form action={signInWithGoogle}>
            {next && <input type="hidden" name="next" value={next} />}
            <Button type="submit" variant="outline" className="w-full">
              <GoogleIcon />
              Google
            </Button>
          </form>
        )}

        {facebook && (
          <form action={signInWithFacebook}>
            {next && <input type="hidden" name="next" value={next} />}
            <Button type="submit" variant="outline" className="w-full">
              <FacebookIcon />
              Facebook
            </Button>
          </form>
        )}

        {zalo && (
          <form action={signInWithZalo}>
            {next && <input type="hidden" name="next" value={next} />}
            <Button type="submit" variant="outline" className="w-full">
              <ZaloIcon />
              Zalo
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Chỉ dùng được với tài khoản chủ trọ đã tạo sẵn cho bạn.
      </p>
    </div>
  );
}

/* Logo giữ nguyên màu thương hiệu — đây là yêu cầu thương hiệu của cả ba bên. */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.83-.07-1.63-.21-2.39H12v4.51h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.5Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.55-2.03-6.46-4.76H1.7v2.98A11.5 11.5 0 0 0 12 23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.54 14.16a6.9 6.9 0 0 1 0-4.31V6.87H1.7a11.51 11.51 0 0 0 0 10.27l3.84-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.28 15.1.25 12 .25 7.52.25 3.65 2.82 1.7 6.87l3.84 2.98C6.45 7.12 9 4.77 12 4.77Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.96h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  );
}

function ZaloIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-4">
      <rect width="48" height="48" rx="11" fill="#0068FF" />
      <path
        fill="#fff"
        d="M14.9 16.2h9.7v2.3l-6.3 8.4h6.5v2.6H14.4v-2.3l6.3-8.4h-5.8v-2.6Zm14.4 13.3c-2.4 0-4.2-1.7-4.2-4.1s1.8-4.2 4.2-4.2c1 0 1.9.3 2.5.9v-.7h2.5v7.9h-2.5v-.7c-.6.6-1.5.9-2.5.9Zm.4-2.3c1.1 0 1.9-.8 1.9-1.9s-.8-1.9-1.9-1.9-1.9.8-1.9 1.9.8 1.9 1.9 1.9Z"
      />
    </svg>
  );
}
