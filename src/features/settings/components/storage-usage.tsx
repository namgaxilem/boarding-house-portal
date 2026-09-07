import { HardDriveIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatBytes } from "@/lib/upload-policy";

/**
 * Bao nhiêu phần của gói miễn phí đã dùng.
 *
 * Gói miễn phí Supabase cho 1GB Storage. Không có gì trong app báo khi sắp hết
 * — chủ trọ chỉ phát hiện lúc một lần tải ảnh lên thất bại, và tới lúc đó thì
 * không rõ phải xoá gì. Bảng này cho biết bucket nào đang phình.
 *
 * Cố ý KHÔNG hiện tên file: hàm SQL `storage_usage()` chỉ trả số đếm và tổng
 * byte, vì danh sách đường dẫn trong `id-photos` chính là danh sách ai đã nộp
 * CCCD.
 */

/** Hạn mức Storage của gói miễn phí Supabase. */
const FREE_TIER_BYTES = 1024 * 1024 * 1024;

const BUCKET_LABEL: Record<string, string> = {
  "room-photos": "Ảnh phòng",
  "id-photos": "Ảnh CCCD",
  "payment-qr": "Ảnh QR chuyển khoản",
  "maintenance-photos": "Ảnh báo hỏng",
};

export async function StorageUsage() {
  const rows = await db.getStorageUsage();

  const used = rows.reduce((sum, row) => sum + row.totalBytes, 0);
  const objects = rows.reduce((sum, row) => sum + row.objectCount, 0);
  const percent = Math.min(100, (used / FREE_TIER_BYTES) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDriveIcon className="size-4 text-muted-foreground" />
          Dung lượng ảnh
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium tabular-nums">
              {formatBytes(used)} / {formatBytes(FREE_TIER_BYTES)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {percent.toFixed(1)}% · {objects} ảnh
            </span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Dung lượng đã dùng trên gói miễn phí"
          >
            <div
              className={
                percent >= 80
                  ? "h-full rounded-full bg-destructive transition-all"
                  : "h-full rounded-full bg-primary transition-all"
              }
              style={{ width: `${Math.max(percent, 0.5)}%` }}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có ảnh nào.</p>
        ) : (
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
            {rows.map((row) => (
              <div key={row.bucket} className="contents">
                <dt className="text-muted-foreground">
                  {BUCKET_LABEL[row.bucket] ?? row.bucket}
                  <span className="ml-2 text-xs">({row.objectCount})</span>
                </dt>
                <dd className="text-right tabular-nums">
                  {formatBytes(row.totalBytes)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Ảnh được thu nhỏ ngay trong máy người gửi trước khi tải lên, nên mỗi tấm
          thường chỉ 300–500KB. Xoá phòng hoặc xoá người thuê sẽ dọn luôn ảnh của
          họ trong bucket.
        </p>
      </CardContent>
    </Card>
  );
}
