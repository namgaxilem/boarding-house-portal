import "server-only";

import { db } from "@/lib/db";
import type { IdDocument } from "@/types";

/**
 * Hiện ảnh hai mặt thẻ từ bucket RIÊNG TƯ.
 *
 * Chạy trên server và ký URL ngay tại thời điểm render. URL ký sống 2 phút — đủ
 * để trình duyệt tải ảnh về, không đủ để ai đó chép link gửi cho người khác.
 *
 * Mỗi lần gọi cũng ghi một dòng vào `id_document_access_log`. Đó là lý do
 * component này KHÔNG được cache: cache lại thì vừa hỏng ảnh khi URL hết hạn,
 * vừa mất luôn dấu vết ai đã xem.
 */
export async function IdPhotos({
  document,
  viewerId,
}: {
  document: IdDocument;
  viewerId: string;
}) {
  const { frontUrl, backUrl } = await db.signIdDocumentPhotos(document, viewerId);

  if (!frontUrl && !backUrl) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        Hồ sơ này không kèm ảnh.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { url: frontUrl, label: "Mặt trước" },
        { url: backUrl, label: "Mặt sau" },
      ].map(({ url, label }) =>
        url ? (
          <figure key={label} className="space-y-1">
            {/* next/image không dùng được ở đây: nó chỉ được phép tải từ đường
                dẫn /object/public/** (xem next.config.ts), còn URL ký nằm ở
                /object/sign/**. Mở next.config cho cả /sign/** thì ảnh CCCD lại
                đi qua bộ tối ưu ảnh và nằm lại trong cache của nó. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              loading="lazy"
              className="aspect-[1.585/1] w-full rounded-lg border border-border object-cover"
            />
            <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
          </figure>
        ) : (
          <p
            key={label}
            className="flex aspect-[1.585/1] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground"
          >
            Thiếu ảnh {label.toLowerCase()}
          </p>
        ),
      )}
    </div>
  );
}
