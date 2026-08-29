import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LandlordContact } from "@/components/common/landlord-contact";
import { PageHeader } from "@/components/common/page-header";
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from "@/components/common/status-badge";
import { CloseRequestForm } from "@/features/maintenance/components/request-actions";
import { RequestPhotos } from "@/features/maintenance/components/request-photos";
import { getMaintenanceRequest } from "@/features/maintenance/queries";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Chi tiết báo hỏng" };

export const instant = true;

export default function MyRequestDetailPage(
  props: PageProps<"/me/maintenance/[requestId]">,
) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
      <Detail {...props} />
    </Suspense>
  );
}

async function Detail(props: PageProps<"/me/maintenance/[requestId]">) {
  const { requestId } = await props.params;
  const searchParams = await props.searchParams;

  const [user, request] = await Promise.all([
    requireUser(),
    getMaintenanceRequest(requestId),
  ]);

  // RLS đã chặn phiếu của phòng khác. `notFound()` ở đây chỉ xử lý id sai.
  if (!request) notFound();

  // Ký URL ảnh ngay trước khi render — chữ ký sống 10 phút.
  const photos = await db.listMaintenancePhotos(requestId);

  // Hai quyền của người thuê, đúng như hàm SQL kiểm ở tầng database:
  //   - sửa: phiếu của chính mình VÀ còn "chờ xử lý";
  //   - đóng: phiếu của chính mình, bất kể trạng thái.
  // Kiểm ở đây chỉ để không hiện nút bấm vào là báo lỗi.
  const isMine = request.reportedBy === user.id;
  const canEdit = isMine && request.status === "open";

  return (
    <div className="space-y-4">
      <PageHeader
        title={request.title}
        description={`Phòng ${request.room.code} · ${request.reporter?.fullName ?? "Người đã xoá"}`}
        actions={
          canEdit ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/me/maintenance/${request.id}/edit`}>
                <PencilIcon />
                Sửa
              </Link>
            </Button>
          ) : undefined
        }
      />

      {searchParams.created === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>
            Đã gửi cho chủ trọ. Bạn nhận thông báo khi có cập nhật.
          </AlertDescription>
        </Alert>
      )}

      {searchParams.updated === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã lưu thay đổi.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-4 p-5 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <MaintenanceStatusBadge status={request.status} />
            <MaintenancePriorityBadge priority={request.priority} showNormal />
          </div>

          {request.description && (
            <p className="whitespace-pre-wrap">{request.description}</p>
          )}

          {request.resolutionNote && (
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground">Chủ trọ ghi</p>
              <p className="mt-1 whitespace-pre-wrap">{request.resolutionNote}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-y-2 border-t border-border pt-3">
            <dt className="text-muted-foreground">Đã gửi</dt>
            <dd className="text-right">{formatDateTime(request.createdAt)}</dd>

            <dt className="text-muted-foreground">Cập nhật</dt>
            <dd className="text-right">{formatDateTime(request.updatedAt)}</dd>

            {request.closedAt && (
              <>
                <dt className="text-muted-foreground">Đã đóng</dt>
                <dd className="text-right">{formatDateTime(request.closedAt)}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <p className="font-semibold">Ảnh chỗ hỏng</p>
            <p className="text-sm text-muted-foreground">
              Một tấm ảnh nói rõ hơn cả đoạn mô tả — chủ trọ biết cần mang gì tới,
              khỏi phải sang xem trước.
            </p>
          </div>

          <RequestPhotos
            requestId={request.id}
            photos={photos}
            // Chỉ người gửi mới đính được ảnh, và chỉ khi phiếu chưa đóng —
            // cùng điều kiện với `can_attach_maintenance()` trong database.
            canAttach={isMine && request.status !== "closed"}
            viewerId={user.id}
            viewerIsAdmin={false}
          />
        </CardContent>
      </Card>

      {isMine && !canEdit && request.status !== "closed" && (
        <p className="text-xs text-muted-foreground">
          Chủ trọ đã bắt đầu xử lý nên phiếu không sửa được nữa. Có thêm thông tin thì
          gửi phiếu mới hoặc gọi trực tiếp.
        </p>
      )}

      <CloseRequestForm request={request} canClose={isMine} />

      {/* Phiếu khẩn thì thẻ liên hệ đỏ lên và đẩy số khẩn cấp ra trước. Phiếu
          thường vẫn hiện, chỉ nhạt hơn — người đang chờ sửa hay muốn hỏi thêm. */}
      {request.status !== "closed" && (
        <LandlordContact
          variant={request.priority === "urgent" ? "urgent" : "default"}
        />
      )}
    </div>
  );
}
