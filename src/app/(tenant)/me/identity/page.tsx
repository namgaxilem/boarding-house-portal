import { Suspense } from "react";
import type { Metadata } from "next";
import { AlertCircleIcon, ClockIcon, ShieldCheckIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/common/form";
import { IdPhotos } from "@/features/identity/components/id-photos";
import { IdScanner } from "@/features/identity/components/id-scanner";
import { getLatestIdDocument } from "@/features/identity/queries";
import { withdrawIdDocument } from "@/features/identity/actions";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ID_DOC_STATUS_LABEL, ID_DOC_STATUS_STYLE } from "@/lib/constants";
import { formatIdNumber } from "@/lib/cccd";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Giấy tờ tuỳ thân" };

/** Phần giải thích là tĩnh; hồ sơ và ảnh (cần ký URL) stream sau. */
export const instant = true;

export default function MyIdentityPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Giấy tờ tuỳ thân</CardTitle>
          <CardDescription>
            Chủ trọ cần số CCCD của bạn để khai báo tạm trú. Quét mã QR trên thẻ là
            nhanh và chính xác nhất — không phải gõ tay số nào.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
            <IdentitySection />
          </Suspense>
        </CardContent>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        Ảnh giấy tờ được lưu ở nơi riêng tư, chỉ bạn và chủ trọ mở được, và mỗi lần
        mở đều có ghi lại. Bạn xoá được hồ sơ chưa duyệt bất cứ lúc nào.
      </p>
    </div>
  );
}

async function IdentitySection() {
  const user = await requireUser();
  const [document, profile] = await Promise.all([
    getLatestIdDocument(user.id),
    db.getProfile(user.id),
  ]);

  // Đã duyệt và số trên hồ sơ khớp với số trong tài khoản: xong việc, không bày
  // form quét ra làm gì nữa.
  const settled = document?.status === "approved" && profile?.idNumber === document.idNumber;

  return (
    <div className="space-y-5">
      {profile?.idNumber && (
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <ShieldCheckIcon className="size-4 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Số CCCD đang lưu</p>
            <p className="font-mono text-sm">{formatIdNumber(profile.idNumber)}</p>
          </div>
        </div>
      )}

      {document && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className={cn(ID_DOC_STATUS_STYLE[document.status])}>
              {document.status === "pending" && <ClockIcon />}
              {ID_DOC_STATUS_LABEL[document.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Gửi lúc {formatDateTime(document.submittedAt)}
            </span>
          </div>

          {document.status === "rejected" && document.reviewNote && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>
                Chủ trọ chưa nhận: {document.reviewNote}
              </AlertDescription>
            </Alert>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Row label="Số CCCD" value={formatIdNumber(document.idNumber)} mono />
            <Row label="Họ tên" value={document.fullName} />
            <Row label="Ngày sinh" value={formatDate(document.dateOfBirth)} />
            <Row label="Ngày cấp" value={formatDate(document.issuedOn)} />
            <Row label="Nơi thường trú" value={document.residence} className="col-span-2" />
          </dl>

          <Suspense fallback={<Skeleton className="h-28 w-full rounded-lg" />}>
            <IdPhotos document={document} viewerId={user.id} />
          </Suspense>

          {document.status === "pending" && (
            <form action={withdrawIdDocument}>
              <input type="hidden" name="documentId" value={document.id} />
              <SubmitButton
                variant="outline"
                size="sm"
                className="w-full"
                pendingText="Đang xoá…"
              >
                Xoá hồ sơ này để quét lại
              </SubmitButton>
            </form>
          )}
        </div>
      )}

      {/* Đang chờ duyệt thì không cho gửi thêm — database cũng chặn bằng unique
          index, nhưng bày ra một cái form chắc chắn lỗi là kiểu thiết kế tệ. */}
      {document?.status === "pending" ? null : settled ? (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:underline">
            Đổi sang thẻ mới hoặc gửi lại ảnh
          </summary>
          <div className="pt-4">
            <IdScanner suggestedName={user.fullName} />
          </div>
        </details>
      ) : (
        <IdScanner suggestedName={user.fullName} />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate", mono && "font-mono")}>{value || "—"}</dd>
    </div>
  );
}
