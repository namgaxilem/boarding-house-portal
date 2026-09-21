"use client";

import { useActionState, useState } from "react";
import { EyeIcon, PencilIcon, SaveIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { POST_VISIBILITY_OPTIONS } from "@/lib/constants";
import type { Post } from "@/types";

import { createMyPost, updateMyPost, updatePostAsAdmin } from "../actions";
import { PostBody } from "./post-body";

const PLACEHOLDER = `## Tiêu đề mục

Một đoạn văn bình thường.

- Gạch đầu dòng
- Gạch đầu dòng nữa

> Câu trích dẫn`;

/**
 * Soạn bài.
 *
 * Xem trước chạy hoàn toàn phía client và dùng lại ĐÚNG component render của
 * trang thật (`PostBody`) — không có bản render thứ hai để lệch nhau. Đổi lại,
 * `parseRichText` phải là hàm thuần không đụng server, và nó là như vậy.
 *
 * Ô `visibility` chỉ hiện cho chủ trọ. Không phải để giấu: người thuê gửi lên
 * `public` sẽ bị RLS từ chối, và một ô bị từ chối lặng lẽ là giao diện nói dối.
 */
export function PostForm({
  post,
  mode,
}: {
  post?: Post;
  /** `admin` thêm ô phạm vi hiển thị và lưu qua action của chủ trọ. */
  mode: "author" | "admin";
}) {
  const action =
    mode === "admin" && post
      ? updatePostAsAdmin.bind(null, post.id)
      : post
        ? updateMyPost.bind(null, post.id)
        : createMyPost;

  const [state, formAction] = useActionState(action, null);
  const errors = fieldErrorsOf(state);

  const [draft, setDraft] = useState(post?.body ?? "");
  const [preview, setPreview] = useState(false);

  const backHref = mode === "admin" ? "/admin/posts" : "/me/posts";

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      <Card>
        <CardHeader>
          <CardTitle>Nội dung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <Field
            name="title"
            label="Tiêu đề"
            required
            errors={errors}
            hint={
              post?.publishedAt
                ? "Bài đã đăng: sửa tiêu đề KHÔNG đổi đường dẫn, để link đã chia sẻ không hỏng."
                : "Đường dẫn của bài được dựng từ tiêu đề này."
            }
          >
            <Input
              defaultValue={post?.title}
              placeholder="Thông báo tạm ngưng cấp nước ngày 12/10"
              maxLength={160}
              required
            />
          </Field>

          <Field
            name="excerpt"
            label="Tóm tắt"
            errors={errors}
            hint="Hiện ở danh sách và trong thẻ chia sẻ Zalo. Bỏ trống thì lấy đoạn đầu."
          >
            <Textarea defaultValue={post?.excerpt ?? ""} rows={2} maxLength={300} />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="body" className="text-sm font-medium">
                Nội dung
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreview((value) => !value)}
              >
                {preview ? <PencilIcon /> : <EyeIcon />}
                {preview ? "Soạn tiếp" : "Xem trước"}
              </Button>
            </div>

            {preview ? (
              <div className="min-h-48 rounded-md border border-input bg-background p-4">
                {draft.trim() ? (
                  <PostBody body={draft} />
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có gì để xem.</p>
                )}
              </div>
            ) : (
              <>
                <Textarea
                  id="body"
                  name="body"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={16}
                  maxLength={20000}
                  required
                  aria-invalid={errors.body ? true : undefined}
                  aria-describedby={errors.body ? "body-error" : undefined}
                  className={errors.body ? "border-destructive" : undefined}
                  placeholder={PLACEHOLDER}
                />
                {errors.body?.[0] && (
                  <p id="body-error" className="text-sm text-destructive">
                    {errors.body[0]}
                  </p>
                )}
              </>
            )}

            {/* `value` + `onChange` làm ô này thành controlled, nên khi đang xem
                trước thì <Textarea> biến mất và form mất luôn trường `body`.
                Ô ẩn giữ giá trị lại. */}
            {preview && <input type="hidden" name="body" value={draft} />}

            <p className="text-xs text-muted-foreground">
              Cú pháp: <code>## Tiêu đề</code>, <code>### Tiêu đề nhỏ</code>,{" "}
              <code>- gạch đầu dòng</code>, <code>&gt; trích dẫn</code>. Link dán thẳng vào là
              tự nhận. Thẻ HTML không chạy — nó hiện đúng như bạn gõ.
            </p>
          </div>

          {mode === "admin" && (
            <Field
              name="visibility"
              label="Phạm vi hiển thị"
              errors={errors}
              hint="Công khai = lên Google và hiện với khách vãng lai. Nội bộ = chỉ người đã đăng nhập."
            >
              <Select defaultValue={post?.visibility ?? "internal"} name="visibility">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_VISIBILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText="Đang lưu…">
          <SaveIcon />
          {post ? "Lưu thay đổi" : "Lưu bản nháp"}
        </SubmitButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={backHref}>Huỷ</Link>
        </Button>
      </div>
    </form>
  );
}
