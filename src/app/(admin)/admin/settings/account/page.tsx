import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/features/auth/components/account-form";
import { ChangePasswordForm } from "@/features/auth/components/password-forms";
import { requireAdmin } from "@/lib/auth/dal";
import { ROLE_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Tài khoản" };

/**
 * Trang này KHÔNG bọc <Suspense>, khác với các tab cài đặt còn lại.
 *
 * Hai lý do, và lý do thứ hai mới là lý do thật:
 *
 *  1. Không được gì. `requireAdmin()` đã chạy ở layout và được `cache()` ghi nhớ
 *     theo từng lượt render, nên lời gọi ở đây là một lần đọc lại trong bộ nhớ —
 *     stream riêng ra chỉ thêm một khung xám nhấp nháy.
 *
 *  2. Form bên trong một Suspense boundary mà thành phần cha lại gọi `cookies()`
 *     sẽ làm Next đổ vỡ khi Server Action TRẢ VỀ LỖI mà không revalidate: lượt
 *     render lại chạy trong ngữ cảnh của action và `cookies()` ném
 *     `InvariantError`. Người dùng gõ sai mật khẩu xác nhận sẽ thấy trang lỗi
 *     thay vì dòng chữ đỏ dưới ô nhập. Bỏ boundary là hết.
 */
export const instant = false;

export default async function AccountSettingsPage() {
  const user = await requireAdmin();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>Tài khoản của bạn</CardTitle>
              <CardDescription>
                Họ tên hiện trong thông báo gửi cho người thuê. Email là thứ dùng để
                đăng nhập.
              </CardDescription>
            </div>
            {/* Vai trò KHÔNG sửa được ở đây, và không có ô nhập nào cho nó. Nâng
                quyền phải làm thủ công bằng SQL — xem README mục 3.3. Một form tự
                đổi vai trò của chính mình là đường ngắn nhất để chủ trọ lỡ tay hạ
                mình xuống thành người thuê rồi không có cách nào lên lại. */}
            <Badge variant="secondary" className="shrink-0">
              {ROLE_LABEL[user.role]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <AccountForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
          <CardDescription>
            Cần nhập mật khẩu hiện tại để xác nhận đúng là bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
