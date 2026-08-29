"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ImagePlusIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/common/form";
import { uploadRoomPhotos } from "@/features/rooms/photo-actions";
import { formatBytes, resizeImage } from "@/lib/image";

const MAX_PER_UPLOAD = 10;

export function PhotoUploader({ roomId }: { roomId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(uploadRoomPhotos, null);
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setLocalError(null);
    const files = Array.from(fileList);

    if (files.length > MAX_PER_UPLOAD) {
      setLocalError(`Mỗi lần tối đa ${MAX_PER_UPLOAD} ảnh. Bạn chọn ${files.length}.`);
      return;
    }

    const formData = new FormData();
    formData.set("roomId", roomId);

    let savedBytes = 0;

    try {
      for (const [index, file] of files.entries()) {
        setStatus(`Đang nén ảnh ${index + 1}/${files.length}…`);
        const { file: resized, originalBytes, resizedBytes } = await resizeImage(file);
        savedBytes += originalBytes - resizedBytes;
        formData.append("photos", resized);
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
      // Cho phép chọn lại đúng file vừa rồi — nếu không reset, `change` sẽ không
      // bắn lần thứ hai với cùng một file.
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

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={busy}
      />

      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2Icon className="animate-spin" /> : <ImagePlusIcon />}
        {busy ? (status ?? "Đang tải lên…") : "Thêm ảnh"}
      </Button>

      <p className="text-xs text-muted-foreground">
        JPG, PNG hoặc WebP. Ảnh được tự động thu nhỏ trong máy bạn trước khi tải lên,
        nên chọn thẳng ảnh gốc từ điện thoại cũng được.
      </p>
    </div>
  );
}
