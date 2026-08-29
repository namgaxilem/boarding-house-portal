"use client";

import { useActionState, useState } from "react";
import { CheckCircle2Icon, WrenchIcon } from "lucide-react";

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
import { closeRequest, setRequestStatus } from "@/features/maintenance/actions";
import { MAINTENANCE_STATUS_OPTIONS } from "@/lib/constants";
import type { MaintenanceRequestDetail, MaintenanceStatus } from "@/types";

/**
 * Bảng xử lý của chủ trọ: đổi trạng thái, ghi lại đã làm gì, ghi chi phí.
 *
 * Ghi chú đi kèm trạng thái chứ không phải một ô riêng bấm lưu sau: người thuê
 * nhận đúng một thông báo cho một lần cập nhật, và thông báo đó mang theo lời
 * giải thích. Tách hai bước ra là gửi hai thông báo, cái đầu rỗng nghĩa.
 */
export function AdminStatusForm({ request }: { request: MaintenanceRequestDetail }) {
  const [state, formAction] = useActionState(setRequestStatus, null);
  const errors = fieldErrorsOf(state);
  const [status, setStatus] = useState<MaintenanceStatus>(
    // Phiếu đã đóng mở lại thì mặc định về "đang sửa": người ta chỉ mở lại phiếu
    // khi cái vừa sửa lại hỏng.
    request.status === "closed" ? "in_progress" : request.status,
  );

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="font-semibold">Xử lý phiếu</p>
          <p className="text-sm text-muted-foreground">
            Người thuê nhận thông báo trong app kèm ghi chú bạn viết ở đây.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <FormMessage state={state} />
          <input type="hidden" name="requestId" value={request.id} />

          <Field name="status" label="Trạng thái" required errors={errors}>
            <Select
              name="status"
              value={status}
              onValueChange={(value) => setStatus(value as MaintenanceStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            name="resolutionNote"
            label="Ghi chú cho người thuê"
            errors={errors}
            hint="Ví dụ: “thợ đến sáng mai 8h” hoặc “đã thay vòi mới”."
          >
            <Textarea rows={3} defaultValue={request.resolutionNote ?? ""} />
          </Field>

          {status === "resolved" && (
            <Field
              name="cost"
              label="Chi phí sửa (đồng)"
              errors={errors}
              hint="Ghi vào nhật ký phòng, người thuê KHÔNG đọc được. Bỏ trống nếu không tốn tiền."
            >
              <Input inputMode="numeric" placeholder="150000" />
            </Field>
          )}

          <SubmitButton className="w-full" pendingText="Đang lưu…">
            <WrenchIcon />
            Cập nhật
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Đóng phiếu — nút này hiện cho cả hai bên.
 *
 * Người thuê đóng được phiếu của chính mình mà không cần chủ trọ xác nhận: cái
 * vòi tự hết rò, hoặc họ báo nhầm. Bắt chờ chủ trọ duyệt một việc như thế chỉ
 * làm hàng chờ dài ra bằng những phiếu không còn ai quan tâm.
 */
export function CloseRequestForm({
  request,
  canClose,
}: {
  request: MaintenanceRequestDetail;
  canClose: boolean;
}) {
  const [state, formAction] = useActionState(closeRequest, null);
  const errors = fieldErrorsOf(state);

  if (!canClose || request.status === "closed") return null;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="font-semibold">Đóng phiếu</p>
          <p className="text-sm text-muted-foreground">
            Đóng khi đã hết hỏng. Phiếu vẫn nằm trong lịch sử của phòng.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <FormMessage state={state} />
          <input type="hidden" name="requestId" value={request.id} />

          <Field name="note" label="Ghi chú" errors={errors}>
            <Input placeholder="Đã hết rò, không cần sửa nữa" />
          </Field>

          <SubmitButton variant="outline" className="w-full" pendingText="Đang đóng…">
            <CheckCircle2Icon />
            Đóng phiếu
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
