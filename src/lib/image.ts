/**
 * Thu nhỏ ảnh ngay trong trình duyệt trước khi tải lên.
 *
 * Ảnh chụp bằng điện thoại thường 3–6MB. Đẩy nguyên lên vừa ăn hết 1GB miễn phí
 * của Supabase Storage, vừa làm trang giới thiệu tải chậm. Nén xuống ~300–500KB
 * là quá đủ cho ảnh phòng trọ, và không tốn dịch vụ nào.
 *
 * Chỉ chạy ở trình duyệt — cần canvas.
 */

const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

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

export interface ResizeResult {
  file: File;
  originalBytes: number;
  resizedBytes: number;
}

export async function resizeImage(file: File): Promise<ResizeResult> {
  // `imageOrientation: "from-image"` là bắt buộc: nếu bỏ qua, ảnh chụp dọc bằng
  // điện thoại sẽ hiện nằm ngang vì thẻ EXIF bị mất khi vẽ lên canvas.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const type = supportsWebp() ? "image/webp" : "image/jpeg";
  const blob = await canvasToBlob(canvas, type, QUALITY);
  if (!blob) throw new Error("Không nén được ảnh.");

  const extension = type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "anh-phong";

  return {
    file: new File([blob], `${baseName}.${extension}`, { type }),
    originalBytes: file.size,
    resizedBytes: blob.size,
  };
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
