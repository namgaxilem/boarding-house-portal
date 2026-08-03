"use client";

import { useActionState } from "react";
import { KeyRoundIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { resetTenantPassword } from "@/features/tenants/actions";

/** Used when a tenant is locked out and has no working email. */
export function ResetTenantPasswordForm({ tenantId }: { tenantId: string }) {
  const [state, formAction] = useActionState(resetTenantPassword, null);
  const errors = fieldErrorsOf(state);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />

      <FormMessage state={state} />

      <Field
        name="password"
        label="Mật khẩu mới"
        hint="Đọc cho người thuê rồi nhắc họ tự đổi lại."
        required
        errors={errors}
      >
        <Input type="text" autoComplete="off" placeholder="Ít nhất 6 ký tự" required />
      </Field>

      <SubmitButton variant="outline" size="sm">
        <KeyRoundIcon />
        Đặt lại mật khẩu
      </SubmitButton>
    </form>
  );
}
