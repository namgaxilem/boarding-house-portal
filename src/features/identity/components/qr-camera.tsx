"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOffIcon, ScanLineIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { decodeQr } from "@/lib/qr";

/**
 * Mở camera sau và quét liên tục cho tới khi thấy mã QR.
 *
 * Toàn bộ việc giải mã chạy trong máy người dùng. Không có khung hình nào rời
 * khỏi điện thoại — đây là điểm khác biệt lớn nhất so với dịch vụ OCR CCCD, và
 * là lý do tính năng này không phát sinh nghĩa vụ chuyển giao dữ liệu cá nhân
 * nhạy cảm cho bên thứ ba.
 */

/** Khoảng cách giữa hai lần thử giải mã. */
const SCAN_INTERVAL_MS = 220;

/** Phần khung hình đưa vào bộ giải mã, tính theo cạnh ngắn. Khớp với ô ngắm. */
const CROP_RATIO = 0.8;

interface QrCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (text: string) => void;
}

export function QrCameraDialog({ open, onOpenChange, onResult }: QrCameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Giữ callback trong ref: nếu để nó trong mảng phụ thuộc thì mỗi lần component
  // cha render lại, camera sẽ bị tắt rồi bật lại — màn hình chớp và mất 1–2 giây.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;

    const canvas = document.createElement("canvas");

    async function tick() {
      if (stopped) return;

      const video = videoRef.current;
      // readyState >= 2 (HAVE_CURRENT_DATA): trước mốc này drawImage vẽ ra khung
      // đen và bộ giải mã chạy phí một vòng.
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        // Chỉ giải mã ô vuông giữa khung hình. Vừa nhanh hơn hẳn (ít điểm ảnh
        // hơn ~3 lần), vừa chính xác hơn: mặt sau thẻ hay lọt vào rìa khung và
        // bộ giải mã bắt nhầm mã QR khác nằm cạnh đó.
        const side = Math.round(Math.min(video.videoWidth, video.videoHeight) * CROP_RATIO);
        canvas.width = side;
        canvas.height = side;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(
            video,
            Math.round((video.videoWidth - side) / 2),
            Math.round((video.videoHeight - side) / 2),
            side,
            side,
            0,
            0,
            side,
            side,
          );

          try {
            const text = await decodeQr(context.getImageData(0, 0, side, side));
            if (text && !stopped) {
              onResultRef.current(text);
              return; // cha sẽ đóng hộp thoại, cleanup tắt camera
            }
          } catch {
            // Khung hình mờ hoặc quá tối — bình thường, thử khung tiếp theo.
          }
        }
      }

      if (!stopped) timer = window.setTimeout(tick, SCAN_INTERVAL_MS);
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            // `ideal` chứ không `exact`: laptop chỉ có webcam trước, `exact` sẽ
            // ném lỗi và không mở được camera nào cả.
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (cause) {
        const name = (cause as DOMException)?.name;
        setError(
          name === "NotAllowedError"
            ? "Bạn đã từ chối quyền camera. Vào cài đặt trình duyệt bật lại, hoặc dùng cách chụp ảnh bên dưới."
            : name === "NotFoundError"
              ? "Máy này không có camera. Dùng cách chụp ảnh bên dưới."
              : "Không mở được camera. Dùng cách chụp ảnh bên dưới.",
        );
        return;
      }

      // Người dùng đóng hộp thoại trong lúc đang xin quyền: stream vừa được cấp
      // là phải tắt ngay, không thì đèn camera cứ sáng.
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play().catch(() => {});
      void tick();
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      // Xoá lỗi lúc ĐÓNG chứ không lúc mở: đặt setError(null) trong effect mở
      // camera sẽ là một lần render thừa ngay trước khi hộp thoại hiện ra.
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quét mã QR trên thẻ</DialogTitle>
          <DialogDescription>
            Đưa mã vuông ở góc trên bên phải MẶT TRƯỚC thẻ vào trong khung. Giữ máy
            cách thẻ khoảng một gang tay.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-8 text-center">
            <CameraOffIcon className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              // `playsInline` + `muted` là bắt buộc trên iOS: thiếu một trong hai
              // thì Safari mở video toàn màn hình thay vì phát tại chỗ.
              className="size-full object-cover"
            />

            {/* Ô ngắm — vẽ đúng vùng thật sự được giải mã (CROP_RATIO). */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-[80%] rounded-lg ring-2 ring-white/80">
                <ScanLineIcon className="absolute inset-0 m-auto size-8 text-white/45" />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
