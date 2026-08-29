import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoorOpenIcon, PencilIcon, Trash2Icon, UserIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmForm } from "@/components/common/confirm-form";
import { PageHeader } from "@/components/common/page-header";
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from "@/components/common/status-badge";
import { deleteRequest } from "@/features/maintenance/actions";
import {
  AdminStatusForm,
  CloseRequestForm,
} from "@/features/maintenance/components/request-actions";
import { RequestPhotos } from "@/features/maintenance/components/request-photos";
import { getMaintenanceRequest } from "@/features/maintenance/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export async function generateMetadata(
  props: PageProps<"/admin/maintenance/[requestId]">,
): Promise<Metadata> {
  const { requestId } = await props.params;
  const request = await getMaintenanceRequest(requestId);
  return { title: request ? `${request.room.code} · ${request.title}` : "Báo hỏng" };
}

export const instant = true;

export default function AdminMaintenanceDetailPage(
  props: PageProps<"/admin/maintenance/[requestId]">,
) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail {...props} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-20 w-full max-w-lg rounded-md" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

async function Detail(props: PageProps<"/admin/maintenance/[requestId]">) {
  const { requestId } = await props.params;
  const searchParams = await props.searchParams;

  const request = await getMaintenanceRequest(requestId);
  if (!request) notFound();

  // Ký URL ảnh CÀNG MUỘN CÀNG TỐT — chữ ký sống 10 phút, ký sớm rồi cache lại là
  // vừa hỏng ảnh vừa mất ý nghĩa của việc để bucket riêng tư.
  const [user, photos] = await Promise.all([
    requireAdmin(),
    db.listMaintenancePhotos(requestId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.title}
        description={`Phòng ${request.room.code} · ${request.reporter?.fullName ?? "Người đã xoá"}`}
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Báo hỏng", href: "/admin/maintenance" },
          { label: request.room.code },
        ]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/admin/maintenance/${request.id}/edit`}>
                <PencilIcon />
                Sửa
              </Link>
            </Button>

            <ConfirmForm
              action={deleteRequest}
              hidden={{ requestId: request.id }}
              title="Xoá hẳn phiếu này?"
              description="Không còn dấu vết nào. Phiếu đã xử lý xong thì nên ĐÓNG chứ không xoá — lịch sử hỏng hóc của phòng là thứ đáng giữ."
              triggerLabel={
                <>
                  <Trash2Icon />
                  Xoá
                </>
              }
              triggerProps={{ className: "text-destructive hover:bg-destructive/10" }}
            />
          </>
        }
      />

      {searchParams.created === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã tạo phiếu.</AlertDescription>
        </Alert>
      )}

      {searchParams.updated === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã lưu thay đổi.</AlertDescription>
        </Alert>
      )}

      {request.priority === "urgent" && request.status !== "closed" && (
        <Alert variant="destructive">
          <AlertDescription>
            Người thuê đánh dấu KHẨN CẤP. Gọi lại cho họ nếu chưa xử lý được ngay.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 p-5 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <MaintenanceStatusBadge status={request.status} />
                <MaintenancePriorityBadge priority={request.priority} showNormal />
              </div>

              {request.description ? (
                <p className="whitespace-pre-wrap">{request.description}</p>
              ) : (
                <p className="text-muted-foreground">Không có mô tả thêm.</p>
              )}

              {request.resolutionNote && (
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Ghi chú người thuê nhìn thấy
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{request.resolutionNote}</p>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-y-2 border-t border-border pt-3">
                <dt className="text-muted-foreground">Gửi lúc</dt>
                <dd className="text-right">{formatDateTime(request.createdAt)}</dd>

                <dt className="text-muted-foreground">Cập nhật</dt>
                <dd className="text-right">{formatDateTime(request.updatedAt)}</dd>

                {request.resolvedAt && (
                  <>
                    <dt className="text-muted-foreground">Báo đã sửa xong</dt>
                    <dd className="text-right">{formatDateTime(request.resolvedAt)}</dd>
                  </>
                )}

                {request.closedAt && (
                  <>
                    <dt className="text-muted-foreground">Đóng lúc</dt>
                    <dd className="text-right">{formatDateTime(request.closedAt)}</dd>
                  </>
                )}
              </dl>

              <div className="flex flex-wrap gap-4 border-t border-border pt-3">
                <Link
                  href={`/admin/rooms/${request.roomId}`}
                  className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                >
                  <DoorOpenIcon className="size-3.5" />
                  Phòng {request.room.code}
                </Link>

                {request.reporter && (
                  <Link
                    href={`/admin/tenants/${request.reporter.id}`}
                    className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                  >
                    <UserIcon className="size-3.5" />
                    {request.reporter.fullName}
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ảnh đính kèm</CardTitle>
              <CardDescription>
                Người thuê chụp chỗ hỏng. Ảnh nằm ở kho riêng tư — chỉ mở được qua
                trang này, không có đường link công khai nào.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <RequestPhotos
                requestId={request.id}
                photos={photos}
                canAttach={request.status !== "closed"}
                viewerId={user.id}
                viewerIsAdmin
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <AdminStatusForm request={request} />
          {/* Chủ trọ đóng được mọi phiếu — `close_maintenance_request()` kiểm lại
              ở tầng database, đây chỉ là hiển thị. */}
          <CloseRequestForm request={request} canClose />
        </div>
      </div>
    </div>
  );
}
