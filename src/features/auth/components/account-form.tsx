"use client";

import { useActionState, useState } from "react";
import { SaveIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { updateAccount } from "@/features/auth/actions";
import type { SessionUser } from "@/types";

/**
 * Sửa họ tên và email của tài khoản chủ trọ đang đăng nhập.
 *
 * Ô mật khẩu LUÔN nằm trong DOM, chỉ là không bắt buộc.
 *
 * Bản đầu tiên chỉ render ô đó khi email bị sửa — gọn hơn, nhưng hỏng ở đúng
 * trường hợp cần nó nhất: nếu JavaScript chưa chạy (đang tải, bị chặn, hoặc
 * hydrate lỗi), state không đổi, ô không bao giờ hiện ra, và người dùng đổi email
 * xong bấm Lưu thì nhận về "dữ liệu chưa hợp lệ" mà không có chỗ nào để sửa.
 *
 * Cảnh báo bên dưới thì vẫn phản ứng theo state — nó là thứ có thì tốt, thiếu
 * cũng không chặn ai làm gì.
 */
export function AccountForm({ user }: { user: SessionUser }) {
  const [state, formAction] = useActionState(updateAccount, null);
  const errors = fieldErrorsOf(state);

  const [email, setEmail] = useState(user.email);
  const nextEmail = email.trim().toLowerCase();
  const emailChanged = nextEmail !== user.email.toLowerCase();

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />

      <Field name="fullName" label="Họ và tên" required errors={errors}>
        <Input defaultValue={user.fullName} autoComplete="name" required />
      </Field>

      <Field
        name="email"
        label="Email đăng nhập"
        required
        errors={errors}
        hint="Cũng là email nhận link đặt lại mật khẩu."
      >
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </Field>

      {emailChanged && (
        <Alert variant="warning">
          <AlertDescription>
            Đổi email là đổi thứ bạn dùng để <strong>đăng nhập</strong>. Từ lần sau
            phải nhập <strong>{nextEmail}</strong>; mật khẩu giữ nguyên. Gõ nhầm là
            không vào lại được — kiểm tra kỹ trước khi lưu.
          </AlertDescription>
        </Alert>
      )}

      <Field
        name="currentPassword"
        label="Mật khẩu hiện tại"
        errors={errors}
        hint="Chỉ cần khi đổi email. Để trống nếu chỉ sửa họ tên."
      >
        <Input type="password" autoComplete="current-password" />
      </Field>

      <SubmitButton>
        <SaveIcon />
        Lưu thay đổi
      </SubmitButton>
    </form>
  );
}
