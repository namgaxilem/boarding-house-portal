"use client";

import { useActionState } from "react";
import { KeyRoundIcon, SendIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import {
  changePassword,
  requestPasswordReset,
  resetPassword,
} from "@/features/auth/actions";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, null);
  const errors = fieldErrorsOf(state);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />

      <Field name="email" label="Email" required errors={errors}>
        <Input type="email" inputMode="email" autoComplete="username" required autoFocus />
      </Field>

      <SubmitButton className="w-full" pendingText="Đang gửi…">
        <SendIcon />
        Gửi link đặt lại
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPassword, null);
  const errors = fieldErrorsOf(state);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />

      <Field name="password" label="Mật khẩu mới" required errors={errors}>
        <Input type="password" autoComplete="new-password" required autoFocus />
      </Field>

      <Field name="confirmPassword" label="Nhập lại mật khẩu" required errors={errors}>
        <Input type="password" autoComplete="new-password" required />
      </Field>

      <SubmitButton className="w-full">
        <KeyRoundIcon />
        Đổi mật khẩu
      </SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, null);
  const errors = fieldErrorsOf(state);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />

      <Field name="currentPassword" label="Mật khẩu hiện tại" required errors={errors}>
        <Input type="password" autoComplete="current-password" required />
      </Field>

      <Field
        name="newPassword"
        label="Mật khẩu mới"
        hint="Ít nhất 6 ký tự."
        required
        errors={errors}
      >
        <Input type="password" autoComplete="new-password" required />
      </Field>

      <Field name="confirmPassword" label="Nhập lại mật khẩu mới" required errors={errors}>
        <Input type="password" autoComplete="new-password" required />
      </Field>

      <SubmitButton>
        <KeyRoundIcon />
        Đổi mật khẩu
      </SubmitButton>
    </form>
  );
}
