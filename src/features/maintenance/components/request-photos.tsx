"use client";

import Image from "next/image";
import { useActionState, useRef, useState, useTransition } from "react";
import { ImageOffIcon, ImagePlusIcon, Loader2Icon } from "lucide-react";

import { ConfirmForm } from "@/components/common/confirm-form";
import { FormMessage } from "@/components/common/form";
import { Button } from "@/components/ui/button";
import {
  deleteMaintenancePhoto,
  uploadMaintenancePhotos,
} from "@/features/maintenance/actions";
import { formatBytes, resizeImage } from "@/lib/image";
import type { MaintenancePhoto } from "@/types";

/**
 * Ảnh đính kèm phiếu báo hỏng.
 *
 * "Vòi nước bếp bị rò" không nói được là rò ở cổ vòi hay ở ống dưới bồn. Chủ trọ
 * vẫn phải đi xem một chuyến trước khi gọi thợ mang đồ — một tấm ảnh bỏ được
 * chuyến đó.
 */

const MAX_PER_UPLOAD = 5;
const MAX_PER_REQUEST = 6;

/**
 * Ngưỡng từ chối TRƯỚC khi giải mã ảnh.
 *
 * `resizeImage` gọi `createImageBitmap`, tức là giải nén cả tấm ảnh vào bộ nhớ.
 * Một file 60MB làm điện thoại tầm trung đứng hình hoặc tab sập — và người dùng
 * chỉ thấy app "hỏng", không thấy lý do. Chặn ở đây rẻ hơn nhiều.
 */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export function RequestPhotos({
  requestId,
  photos,
  canAttach,
  viewerId,
  viewerIsAdmin,
}: {
  requestId: string;
  photos: MaintenancePhoto[];
  /** Còn được thêm ảnh không — phiếu đóng rồi thì không. */
  canAttach: boolean;
  /** Id người đang xem. Dữ liệu, không phải hàm: props phải serialize được. */
  viewerId: string;
  viewerIsAdmin: boolean;
}) {
  // Cùng điều kiện với policy `maintenance_photos_delete` ở migration 0009.
  // Kiểm ở đây chỉ để không hiện nút bấm vào là báo lỗi — RLS mới là rào chắn.
  const canDelete = (photo: MaintenancePhoto) =>
    viewerIsAdmin || (photo.uploadedBy === viewerId && canAttach);

  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(uploadMaintenancePhotos, null);
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const remaining = MAX_PER_REQUEST - photos.length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setLocalError(null);
    const files = Array.from(fileList);

    if (files.length > MAX_PER_UPLOAD) {
      setLocalError(`Mỗi lần tối đa ${MAX_PER_UPLOAD} ảnh. Bạn chọn ${files.length}.`);
      return;
    }
    if (files.length > remaining) {
      setLocalError(
        `Phiếu này còn chỗ cho ${remaining} ảnh (tối đa ${MAX_PER_REQUEST}). Xoá bớt trước khi thêm.`,
      );
      return;
    }

    const tooBig = files.find((file) => file.size > MAX_INPUT_BYTES);
    if (tooBig) {
      setLocalError(
        `"${tooBig.name}" nặng ${formatBytes(tooBig.size)} — quá lớn để xử lý trong máy. Chụp lại bằng camera điện thoại thay vì gửi ảnh gốc từ máy ảnh.`,
      );
      return;
    }

    const formData = new FormData();
    formData.set("requestId", requestId);

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

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.id} className="space-y-1.5">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
                {photo.url ? (
                  // `unoptimized`: URL đã ký và hết hạn sau ít phút. Để Next tối
                  // ưu và cache lại thì bản cache sống lâu hơn chữ ký — ảnh riêng
                  // tư nằm trong cache của máy chủ ảnh, đúng thứ bucket private
                  // được dựng ra để tránh.
                  <Image
                    src={photo.url}
                    alt="Ảnh đính kèm phiếu báo hỏng"
                    fill
                    unoptimized
                    sizes="(min-width: 640px) 200px, 45vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <ImageOffIcon className="size-5" />
                    <span className="text-[11px]">Không mở được ảnh</span>
                  </div>
                )}
              </div>

              {canDelete(photo) && (
                <ConfirmForm
                  action={deleteMaintenancePhoto}
                  hidden={{ photoId: photo.id, requestId }}
                  title="Xoá ảnh này?"
                  description="Ảnh bị xoá hẳn khỏi máy chủ, không khôi phục được."
                  triggerLabel="Xoá ảnh"
                  triggerProps={{
                    variant: "ghost",
                    size: "sm",
                    className:
                      "w-full text-muted-foreground hover:text-destructive",
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {canAttach && remaining > 0 && (
        <>
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
            className="w-full"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2Icon className="animate-spin" /> : <ImagePlusIcon />}
            {busy ? (status ?? "Đang tải lên…") : "Thêm ảnh"}
          </Button>

          <p className="text-xs text-muted-foreground">
            JPG, PNG hoặc WebP. Ảnh được thu nhỏ ngay trong máy bạn trước khi gửi, nên
            chụp thẳng bằng điện thoại là được. Còn {remaining}/{MAX_PER_REQUEST} chỗ.
          </p>
        </>
      )}

      {canAttach && remaining <= 0 && (
        <p className="text-xs text-muted-foreground">
          Đã đủ {MAX_PER_REQUEST} ảnh. Xoá bớt nếu muốn thêm ảnh khác.
        </p>
      )}

      {!canAttach && photos.length === 0 && (
        <p className="text-sm text-muted-foreground">Phiếu này không có ảnh đính kèm.</p>
      )}
    </div>
  );
}
