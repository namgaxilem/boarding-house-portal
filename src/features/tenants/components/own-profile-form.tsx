"use client";

import { useActionState } from "react";
import { SaveIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { updateOwnProfile } from "@/features/tenants/actions";
import { toDateInputValue } from "@/lib/format";
import type { Profile } from "@/types";

export function OwnProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateOwnProfile, null);
  const errors = fieldErrorsOf(state);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />

      <Field name="fullName" label="Họ và tên" required errors={errors}>
        <Input defaultValue={profile.fullName} required />
      </Field>

      <Field name="phone" label="Số điện thoại" hint="10 số, bắt đầu bằng 0." errors={errors}>
        <Input type="tel" inputMode="tel" defaultValue={profile.phone ?? ""} />
      </Field>

      <Field name="dateOfBirth" label="Ngày sinh" errors={errors}>
        <Input type="date" defaultValue={toDateInputValue(profile.dateOfBirth)} />
      </Field>

      <Field name="hometown" label="Quê quán" errors={errors}>
        <Input defaultValue={profile.hometown ?? ""} />
      </Field>

      <SubmitButton>
        <SaveIcon />
        Lưu thông tin
      </SubmitButton>
    </form>
  );
}
