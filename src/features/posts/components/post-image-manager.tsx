"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ImagePlusIcon, Loader2Icon, StarIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/common/form";
import { formatBytes, resizeImage } from "@/lib/image";
import { POST_IMAGE_POLICY as POLICY, acceptAttribute } from "@/lib/upload-policy";
import { cn } from "@/lib/utils";
import type { PostImage } from "@/types";

import { deletePostImage, setPostCover, uploadPostImages } from "../image-actions";

/**
 * Tải ảnh lên, chọn ảnh bìa, xoá ảnh.
 *
 * Nén trong trình duyệt TRƯỚC khi gửi (`resizeImage`), giống ảnh phòng và ảnh
 * báo hỏng — trên gói miễn phí 1GB thì một ảnh gốc 5MB từ điện thoại ăn phần của
 * cả chục bài khác.
 */
export function PostImageManager({
  postId,
  images,
  coverPath,
}: {
  postId: string;
  images: PostImage[];
  coverPath: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(uploadPostImages, null);
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const full = images.length >= POLICY.maxPerParent;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setLocalError(null);
    const files = Array.from(fileList);

    if (images.length + files.length > POLICY.maxPerParent) {
      setLocalError(
        `Bài này đã có ${images.length} ảnh, tối đa ${POLICY.maxPerParent}. Xoá bớt trước khi thêm.`,
      );
      return;
    }

    const formData = new FormData();
    formData.set("postId", postId);

    let savedBytes = 0;

    try {
      for (const [index, file] of files.entries()) {
        setStatus(`Đang nén ảnh ${index + 1}/${files.length}…`);
        const { file: resized, originalBytes, resizedBytes } = await resizeImage(file, POLICY);
        savedBytes += originalBytes - resizedBytes;
        formData.append("images", resized);
      }
    } catch (error) {
      setStatus(null);
      setLocalError((error as Error).message);
      return;
    }

    setStatus(
      savedBytes > 0
        ? `Đang tải lên… (đã nén bớt ${formatBytes(savedBytes)})`
        : "Đang tải lên…",
    );

    startTransition(() => {
      formAction(formData);
      setStatus(null);
      // Cho phép chọn lại đúng file vừa rồi — không reset thì `change` không bắn
      // lần thứ hai với cùng một file.
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  const busy = isPending || status !== null;

  return (
    <div className="space-y-3">
      <FormMessage state={state} />

      {localError && (
        <p className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          {localError}
        </p>
      )}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => {
            const isCover = image.storagePath === coverPath;
            return (
              <li
                key={image.id}
                className={cn(
                  "group relative overflow-hidden rounded-lg border",
                  isCover ? "border-primary" : "border-border",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh vừa
                    tải lên có thể chưa kịp qua bộ tối ưu; đây là màn hình quản
                    trị, không phải trang công khai. */}
                <img
                  src={image.url}
                  alt={image.alt ?? ""}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />

                {isCover && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Ảnh bìa
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1">
                  {!isCover && (
                    <form action={setPostCover}>
                      <input type="hidden" name="postId" value={postId} />
                      <input type="hidden" name="storagePath" value={image.storagePath} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2"
                        title="Đặt làm ảnh bìa"
                      >
                        <StarIcon className="size-3.5" />
                        <span className="sr-only">Đặt làm ảnh bìa</span>
                      </Button>
                    </form>
                  )}

                  <form action={deletePostImage}>
                    <input type="hidden" name="postId" value={postId} />
                    <input type="hidden" name="imageId" value={image.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2 text-destructive"
                      title="Xoá ảnh"
                    >
                      <Trash2Icon className="size-3.5" />
                      <span className="sr-only">Xoá ảnh</span>
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute(POLICY)}
        multiple
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={busy || full}
      />

      <Button
        type="button"
        variant="outline"
        disabled={busy || full}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2Icon className="animate-spin" /> : <ImagePlusIcon />}
        {busy ? (status ?? "Đang tải lên…") : full ? "Đã đủ ảnh" : "Thêm ảnh"}
      </Button>

      <p className="text-xs text-muted-foreground">
        JPG, PNG hoặc WebP, tối đa {POLICY.maxPerParent} ảnh. Ảnh được thu nhỏ ngay trong
        máy bạn trước khi tải lên. Ảnh bìa là tấm hiện ra khi dán link bài lên Zalo.
      </p>
      <p className="text-xs text-muted-foreground">
        ⚠️ Ảnh trong bài nằm ở kho công khai — ai có đúng đường dẫn đều mở được, kể cả khi
        bài chỉ để nội bộ. Đừng đính ảnh riêng tư.
      </p>
    </div>
  );
}
