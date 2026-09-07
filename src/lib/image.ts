/**
 * Thu nhỏ ảnh ngay trong trình duyệt trước khi tải lên.
 *
 * Ảnh chụp bằng điện thoại thường 3–6MB. Đẩy nguyên lên vừa ăn hết 1GB miễn phí
 * của Supabase Storage, vừa làm trang giới thiệu tải chậm.
 *
 * Bản trước thu về 1600px ở chất lượng 0.82 rồi thôi — KHÔNG kiểm tra kết quả
 * nặng bao nhiêu. Với ảnh nhiều chi tiết (lá cây, gạch hoa, vân tường) một tấm
 * 1600px vẫn ra hơn 1MB. Giờ mã hoá theo BẬC THANG: hạ chất lượng, rồi hạ kích
 * thước, cho tới khi chạm `targetBytes` của policy.
 *
 * Chỉ chạy ở trình duyệt — cần canvas.
 */

import {
  formatBytes,
  ROOM_PHOTO_POLICY,
  type UploadPolicy,
} from "@/lib/upload-policy";

export { formatBytes };

/** Safari cũ chưa hỗ trợ WebP khi encode; dò một lần rồi nhớ lại. */
let webpSupport: boolean | null = null;

function supportsWebp() {
  if (webpSupport !== null) return webpSupport;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupport;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

export interface EncodeStep {
  maxDimension: number;
  quality: number;
}

/**
 * Các bậc mã hoá sẽ thử, theo thứ tự, cho tới khi kết quả xuống dưới
 * `targetBytes`.
 *
 * Hạ CHẤT LƯỢNG trước, hạ KÍCH THƯỚC sau — cố ý. Mắt người chịu được ảnh
 * 1600px hơi nhiễu hơn là ảnh 960px sạch sẽ, vì trên màn hình điện thoại 2x
 * thì ảnh 960px nhìn thấy rõ là bị kéo giãn.
 *
 * Hàm thuần, không đụng canvas, nên test được dưới môi trường node của vitest.
 */
export function encodeLadder(policy: UploadPolicy): EncodeStep[] {
  const { maxDimension, quality } = policy;

  /** Không xuống dưới 0.45: dưới mức đó JPEG/WebP bắt đầu hiện vệt vuông. */
  const floor = 0.45;
  const q = (drop: number) => Math.max(floor, Number((quality - drop).toFixed(2)));
  const d = (scale: number) => Math.round(maxDimension * scale);

  return [
    { maxDimension, quality },
    { maxDimension, quality: q(0.12) },
    { maxDimension, quality: q(0.24) },
    { maxDimension: d(0.75), quality: q(0.12) },
    { maxDimension: d(0.6), quality: q(0.18) },
    { maxDimension: d(0.5), quality: q(0.24) },
  ];
}

/**
 * Kích thước sau khi thu về vừa khung `maxDimension`, giữ nguyên tỉ lệ.
 * Ảnh vốn đã nhỏ hơn khung thì giữ nguyên, không phóng to.
 *
 * Hàm thuần — test được.
 */
export function fitDimensions(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface ResizeResult {
  file: File;
  originalBytes: number;
  resizedBytes: number;
}

export async function resizeImage(
  file: File,
  policy: UploadPolicy = ROOM_PHOTO_POLICY,
): Promise<ResizeResult> {
  // Chặn TRƯỚC khi giải nén. `createImageBitmap` nạp cả tấm ảnh vào RAM dạng
  // bitmap thô; một file 50MB làm sập tab trước khi kịp báo lỗi gì.
  if (file.size > policy.maxInputBytes) {
    throw new Error(
      `Ảnh "${file.name}" nặng ${formatBytes(file.size)}, vượt mức ${formatBytes(policy.maxInputBytes)}. Chụp bằng chế độ thường, đừng dùng RAW.`,
    );
  }

  // `imageOrientation: "from-image"` là bắt buộc: nếu bỏ qua, ảnh chụp dọc bằng
  // điện thoại sẽ hiện nằm ngang vì thẻ EXIF bị mất khi vẽ lên canvas.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const type = supportsWebp() ? "image/webp" : "image/jpeg";
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  }

  let best: Blob | null = null;

  try {
    for (const step of encodeLadder(policy)) {
      const { width, height } = fitDimensions(
        bitmap.width,
        bitmap.height,
        step.maxDimension,
      );

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, type, step.quality);
      if (!blob) continue;

      // Giữ bậc nhẹ nhất từng tạo được, phòng khi chạy hết thang mà vẫn chưa
      // chạm đích — thà trả về tấm nhẹ nhất còn hơn ném lỗi.
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= policy.targetBytes) break;
    }
  } finally {
    bitmap.close();
  }

  if (!best) throw new Error("Không nén được ảnh.");

  const extension = type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "anh";

  return {
    file: new File([best], `${baseName}.${extension}`, { type }),
    originalBytes: file.size,
    resizedBytes: best.size,
  };
}
