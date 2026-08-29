"use client";

import { Link } from "@/components/common/link";
import { useActionState } from "react";
import { LogInIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { signIn } from "@/features/auth/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signIn, null);
  const errors = fieldErrorsOf(state);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <FormMessage state={state} />

      <Field name="email" label="Email" required errors={errors}>
        <Input
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="ban@example.com"
          autoFocus
          required
        />
      </Field>

      <Field name="password" label="Mật khẩu" required errors={errors}>
        <Input type="password" autoComplete="current-password" required />
      </Field>

      <SubmitButton className="w-full" pendingText="Đang đăng nhập…">
        <LogInIcon />
        Đăng nhập
      </SubmitButton>

      <p className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Quên mật khẩu?
        </Link>
      </p>
    </form>
  );
}
