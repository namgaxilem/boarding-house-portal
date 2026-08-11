import { Suspense } from "react";
import type { Metadata } from "next";
import { IdCardIcon, TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { IdPhotos } from "@/features/identity/components/id-photos";
import { IdReviewActions } from "@/features/identity/components/id-review-actions";
import { listPendingIdDocuments } from "@/features/identity/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { formatIdNumber } from "@/lib/cccd";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Giấy tờ tuỳ thân" };

export const instant = true;

export default function AdminIdentityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Giấy tờ tuỳ thân"
        description="Hồ sơ CCCD người thuê gửi lên, chờ bạn đối chiếu với ảnh rồi duyệt."
        breadcrumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Giấy tờ" }]}
      />

      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <PendingQueue />
      </Suspense>
    </div>
  );
}

async function PendingQueue() {
  const admin = await requireAdmin();
  const pending = await listPendingIdDocuments();

  if (pending.length === 0) {
    return (
      <EmptyState
        icon={<IdCardIcon />}
        title="Không có hồ sơ nào chờ duyệt"
        description="Người thuê gửi CCCD từ mục Giấy tờ tuỳ thân trong cổng của họ."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {pending.map((document) => {
        // Người này đã có số CCCD trong hồ sơ và số mới KHÁC số cũ. Có thể là đổi
        // sang thẻ căn cước mới (bình thường), cũng có thể là gửi nhầm thẻ của
        // người khác. Chủ trọ phải nhìn thấy điều đó trước khi bấm duyệt.
        const replacing =
          document.tenant.idNumber !== null &&
          document.tenant.idNumber !== document.idNumber;

        return (
          <li key={document.id}>
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{document.tenant.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {document.tenant.email}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Gửi lúc {formatDateTime(document.submittedAt)}
                    {document.source === "manual" && " · gõ tay, không quét được mã"}
                  </span>
                </div>

                {replacing && (
                  <Alert variant="destructive">
                    <TriangleAlertIcon />
                    <AlertDescription>
                      Người này đang có số {formatIdNumber(document.tenant.idNumber)}.
                      Duyệt sẽ ghi đè bằng số mới — kiểm tra ảnh kỹ trước khi bấm.
                    </AlertDescription>
                  </Alert>
                )}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                  <Row label="Số CCCD" value={formatIdNumber(document.idNumber)} mono />
                  <Row label="Họ tên trên thẻ" value={document.fullName} />
                  <Row label="Ngày sinh" value={formatDate(document.dateOfBirth)} />
                  <Row label="Giới tính" value={document.gender} />
                  <Row label="Ngày cấp" value={formatDate(document.issuedOn)} />
                  <Row
                    label="CMND cũ"
                    value={document.oldIdNumber && formatIdNumber(document.oldIdNumber)}
                    mono
                  />
                  <Row
                    label="Nơi thường trú"
                    value={document.residence}
                    className="col-span-2 sm:col-span-3"
                  />
                </dl>

                <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
                  <IdPhotos document={document} viewerId={admin.id} />
                </Suspense>

                <IdReviewActions documentId={document.id} />
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
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
      <dd className={mono ? "truncate font-mono" : "truncate"}>{value || "—"}</dd>
    </div>
  );
}
