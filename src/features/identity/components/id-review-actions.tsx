"use client";

import { useActionState, useState } from "react";
import { CheckIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";

import { approveIdDocument, rejectIdDocument } from "../actions";

/**
 * Hai nút quyết định của chủ trọ.
 *
 * Duyệt là thao tác một chạm. Từ chối thì bắt mở ô lý do trước — người thuê nhận
 * được "không hợp lệ" mà không biết sai chỗ nào sẽ gửi lại y hệt lần nữa.
 */
export function IdReviewActions({ documentId }: { documentId: string }) {
  const [approveState, approveAction] = useActionState(approveIdDocument, null);
  const [rejectState, rejectAction] = useActionState(rejectIdDocument, null);
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="space-y-3">
      <FormMessage state={approveState} />
      <FormMessage state={rejectState} />

      {rejecting ? (
        <form action={rejectAction} className="space-y-3">
          <input type="hidden" name="documentId" value={documentId} />

          <Field
            name="note"
            label="Lý do từ chối"
            required
            errors={fieldErrorsOf(rejectState)}
            hint="Người thuê đọc được câu này, viết cụ thể: ảnh mờ, thiếu mặt sau, số không khớp…"
          >
            <Textarea rows={3} placeholder="Ảnh mặt sau bị loá, chụp lại giúp tôi." />
          </Field>

          <div className="flex gap-2">
            <SubmitButton variant="destructive" size="sm" pendingText="Đang gửi…">
              Gửi lý do từ chối
            </SubmitButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRejecting(false)}
            >
              Huỷ
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <form action={approveAction}>
            <input type="hidden" name="documentId" value={documentId} />
            <SubmitButton size="sm" pendingText="Đang duyệt…">
              <CheckIcon />
              Duyệt và lưu số CCCD
            </SubmitButton>
          </form>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRejecting(true)}
          >
            <XIcon />
            Từ chối
          </Button>
        </div>
      )}
    </div>
  );
}
