"use client";

import { useActionState } from "react";
import { SendIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import {
  MAINTENANCE_PRIORITY_OPTIONS,
  MAINTENANCE_SUGGESTIONS,
} from "@/lib/constants";
import type { ActionResult } from "@/lib/action-result";
import type { MaintenanceRequestDetail, Room } from "@/types";

type FormAction = (
  prev: ActionResult<string> | null,
  formData: FormData,
) => Promise<ActionResult<string> | null>;

/**
 * Form gửi/sửa phiếu báo hỏng — dùng chung cho cả hai bên.
 *
 * Khác nhau đúng một chỗ: chủ trọ chọn phòng, người thuê thì không. Phòng của
 * người thuê được suy ra ở server từ hợp đồng đang hiệu lực; nhận `roomId` từ
 * form là mở đường cho một người báo hỏng hộ phòng khác.
 */
export function RequestForm({
  action,
  request,
  rooms,
  cancelHref,
  submitLabel,
}: {
  action: FormAction;
  request?: MaintenanceRequestDetail;
  /** Truyền vào là bản của chủ trọ; bỏ trống là bản của người thuê. */
  rooms?: Room[];
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const errors = fieldErrorsOf(state);

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          {rooms && (
            <Field name="roomId" label="Phòng" required errors={errors}>
              <Select name="roomId" defaultValue={request?.roomId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phòng" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field
            name="priority"
            label="Mức độ"
            required
            errors={errors}
            hint="Chọn “Khẩn cấp” khi có nguy hiểm: rò điện, ngập, cháy."
          >
            <Select name="priority" defaultValue={request?.priority ?? "normal"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            name="title"
            label="Hỏng cái gì"
            required
            errors={errors}
            className={rooms ? "sm:col-span-2" : "sm:col-span-2"}
            hint="Gõ vài chữ, hoặc chọn trong danh sách gợi ý."
          >
            {/* `list` gợi ý sẵn nhưng vẫn cho gõ tự do — người thuê dùng điện
                thoại, chọn nhanh hơn gõ, mà cái hỏng thì không bao giờ hết kiểu. */}
            <Input
              defaultValue={request?.title}
              list="maintenance-suggestions"
              placeholder="Vòi nước bếp bị rò"
              required
            />
          </Field>

          <datalist id="maintenance-suggestions">
            {MAINTENANCE_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>

          <Field
            name="description"
            label="Mô tả thêm"
            errors={errors}
            className="sm:col-span-2"
            hint="Hỏng từ bao giờ, ở chỗ nào trong phòng, đã thử gì chưa."
          >
            <Textarea rows={4} defaultValue={request?.description ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Huỷ</Link>
        </Button>
        <SubmitButton pendingText="Đang gửi…">
          <SendIcon />
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
