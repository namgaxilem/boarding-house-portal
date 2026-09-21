"use client";

import { useActionState, useState } from "react";
import { ArchiveIcon, GlobeIcon, LockIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";

import type { PostStatus } from "@/types";

import { approvePost, archivePost, publishPost, rejectPost } from "../actions";

/**
 * Hai quyết định của chủ trọ.
 *
 * Duyệt là một chạm, nhưng phải chọn phạm vi trước — và đó là lý do có HAI nút
 * duyệt chứ không phải một nút cộng một ô chọn: "cho hiện với người thuê" và
 * "đẩy lên Google" là hai việc khác nhau, và một dropdown mặc định sẵn sẽ được
 * bấm qua mà không ai đọc.
 *
 * Từ chối thì bắt mở ô lý do trước — người thuê nhận "không hợp lệ" mà không
 * biết sai chỗ nào sẽ gửi lại y hệt lần nữa.
 */
export function PostReviewActions({ postId }: { postId: string }) {
  const [approveState, approveAction] = useActionState(approvePost, null);
  const [rejectState, rejectAction] = useActionState(rejectPost, null);
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="space-y-3">
      <FormMessage state={approveState} />
      <FormMessage state={rejectState} />

      {rejecting ? (
        <form action={rejectAction} className="space-y-3">
          <input type="hidden" name="postId" value={postId} />

          <Field
            name="note"
            label="Lý do từ chối"
            required
            errors={fieldErrorsOf(rejectState)}
            hint="Tác giả đọc được câu này. Viết cụ thể: sai thông tin, thiếu ngày, lời lẽ không phù hợp…"
          >
            <Textarea rows={3} placeholder="Thiếu ngày giờ cụ thể, bổ sung giúp tôi." />
          </Field>

          <div className="flex gap-2">
            <SubmitButton variant="destructive" size="sm" pendingText="Đang gửi…">
              Gửi lý do từ chối
            </SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRejecting(false)}>
              Huỷ
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <form action={approveAction}>
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="visibility" value="internal" />
            <SubmitButton size="sm" pendingText="Đang duyệt…">
              <LockIcon />
              Duyệt — chỉ nội bộ
            </SubmitButton>
          </form>

          <form action={approveAction}>
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="visibility" value="public" />
            <SubmitButton size="sm" variant="outline" pendingText="Đang duyệt…">
              <GlobeIcon />
              Duyệt — công khai
            </SubmitButton>
          </form>

          <Button type="button" variant="outline" size="sm" onClick={() => setRejecting(true)}>
            <XIcon />
            Từ chối
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Đăng / gỡ. Dùng cho bài NHÁP của chính chủ trọ và bài ĐÃ GỠ muốn dựng lại —
 * hai thứ đó không đi qua hàng chờ duyệt, vì người duyệt cũng chính là tác giả.
 */
export function PostPublishActions({ postId, status }: { postId: string; status: PostStatus }) {
  const [publishState, publishAction] = useActionState(publishPost, null);
  const [archiveState, archiveAction] = useActionState(archivePost, null);

  const canPublish = status === "draft" || status === "archived";
  const canArchive = status === "published";

  if (!canPublish && !canArchive) return null;

  return (
    <div className="space-y-3">
      <FormMessage state={publishState} />
      <FormMessage state={archiveState} />

      <div className="flex flex-wrap gap-2">
        {canPublish && (
          <>
            <form action={publishAction}>
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="visibility" value="internal" />
              <SubmitButton size="sm" pendingText="Đang đăng…">
                <LockIcon />
                Đăng — chỉ nội bộ
              </SubmitButton>
            </form>

            <form action={publishAction}>
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="visibility" value="public" />
              <SubmitButton size="sm" variant="outline" pendingText="Đang đăng…">
                <GlobeIcon />
                Đăng — công khai
              </SubmitButton>
            </form>
          </>
        )}

        {canArchive && (
          <form action={archiveAction}>
            <input type="hidden" name="postId" value={postId} />
            {/* Gỡ, KHÔNG xoá: dòng ở lại để giữ chỗ cho slug. Xoá hẳn rồi để một
                bài mới trùng tiêu đề chiếm lại đúng URL đó là cách làm hỏng chỉ
                mục Google mà không ai nhận ra. */}
            <SubmitButton size="sm" variant="outline" pendingText="Đang gỡ…">
              <ArchiveIcon />
              Gỡ khỏi trang
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
