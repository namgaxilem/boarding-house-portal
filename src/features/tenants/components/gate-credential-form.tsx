"use client";

import { useActionState } from "react";
import { EyeOffIcon, KeyRoundIcon, SaveIcon, Trash2Icon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { ConfirmForm } from "@/components/common/confirm-form";
import { clearGateCredential, saveGateCredential } from "@/features/tenants/actions";
import { formatDateTime } from "@/lib/format";
import type { GateCredential } from "@/types";

/**
 * Mã mở cổng / ngăn vân tay của một người thuê — sổ tay của chủ trọ.
 *
 * Chỉ hiện trong khu quản trị và chỉ chủ trọ nhập tay. Người thuê không có trang
 * nào xem được thông tin này, và RLS trên `gate_credentials` cũng không cho.
 */
export function GateCredentialForm({
  tenantId,
  credential,
}: {
  tenantId: string;
  credential: GateCredential | null;
}) {
  const [state, formAction] = useActionState(
    saveGateCredential.bind(null, tenantId),
    null,
  );
  const errors = fieldErrorsOf(state);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <KeyRoundIcon className="size-4 text-muted-foreground" />
          Mã cổng / vân tay
        </CardTitle>
        {credential && (
          <ConfirmForm
            action={clearGateCredential}
            hidden={{ tenantId }}
            title="Xoá ghi chép mã cổng?"
            description="Chỉ xoá ghi chép trong app. Nhớ xoá cả mã và ngăn vân tay trên thiết bị ở cổng."
            triggerLabel={
              <>
                <Trash2Icon />
                Xoá
              </>
            }
            triggerProps={{
              size: "sm",
              className: "text-destructive hover:bg-destructive/10",
            }}
          />
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <p className="flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          <EyeOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Người thuê KHÔNG xem được phần này. Đây là ghi chép để bạn biết ngăn vân tay
          nào cần xoá khi họ trả phòng.
        </p>

        <form action={formAction} className="space-y-4">
          <FormMessage state={state} />

          <Field
            name="gateCode"
            label="Mã mở cổng"
            hint="4–20 ký tự, chỉ số và dấu * #."
            errors={errors}
          >
            <Input
              defaultValue={credential?.gateCode ?? ""}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ví dụ: 204815"
              className="font-mono"
            />
          </Field>

          <Field
            name="fingerprintSlot"
            label="Ngăn vân tay trên đầu đọc"
            hint="Ghi đúng như thiết bị hiển thị, để xoá không nhầm người."
            errors={errors}
          >
            <Input
              defaultValue={credential?.fingerprintSlot ?? ""}
              placeholder="Ví dụ: Ngăn 03 — ngón trỏ phải"
            />
          </Field>

          <Field name="note" label="Ghi chú" errors={errors}>
            <Textarea
              defaultValue={credential?.note ?? ""}
              rows={2}
              placeholder="Ví dụ: đã đăng ký thêm vân tay của vợ, ngăn 04."
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {credential
                ? `Cập nhật lần cuối ${formatDateTime(credential.updatedAt)}`
                : "Chưa có ghi chép nào."}
            </p>
            <SubmitButton size="sm">
              <SaveIcon />
              Lưu
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
