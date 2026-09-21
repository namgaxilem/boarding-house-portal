"use client";

import { useActionState } from "react";
import { SendIcon, Undo2Icon } from "lucide-react";

import { FormMessage, SubmitButton } from "@/components/common/form";
import type { PostStatus } from "@/types";

import { submitMyPost, withdrawMyPost } from "../actions";

/**
 * Gửi đi duyệt / rút lại — hai nút của tác giả.
 *
 * Bài `rejected` cũng gửi lại được qua đúng nút này: `submitPost` xoá sạch ba
 * cột `review_*` trước khi đổi trạng thái, vì WITH CHECK của `posts_update_own`
 * đòi cả ba là null. Bỏ bước đó thì lệnh bị RLS từ chối và người dùng thấy một
 * lỗi không giải thích được.
 */
export function PostAuthorActions({ postId, status }: { postId: string; status: PostStatus }) {
  const [submitState, submitAction] = useActionState(submitMyPost, null);
  const [withdrawState, withdrawAction] = useActionState(withdrawMyPost, null);

  const canSubmit = status === "draft" || status === "rejected";
  const canWithdraw = status === "pending";

  if (!canSubmit && !canWithdraw) return null;

  return (
    <div className="space-y-3">
      <FormMessage state={submitState} />
      <FormMessage state={withdrawState} />

      {canSubmit && (
        <form action={submitAction}>
          <input type="hidden" name="postId" value={postId} />
          <SubmitButton pendingText="Đang gửi…">
            <SendIcon />
            {status === "rejected" ? "Gửi lại cho chủ trọ" : "Gửi cho chủ trọ duyệt"}
          </SubmitButton>
        </form>
      )}

      {canWithdraw && (
        <form action={withdrawAction}>
          <input type="hidden" name="postId" value={postId} />
          <SubmitButton variant="outline" pendingText="Đang rút…">
            <Undo2Icon />
            Rút lại để sửa
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
