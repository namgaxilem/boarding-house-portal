import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { updateMyRequest } from "@/features/maintenance/actions";
import { RequestForm } from "@/features/maintenance/components/request-form";
import { getMaintenanceRequest } from "@/features/maintenance/queries";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Sửa báo hỏng" };

export const instant = true;

export default function EditMyRequestPage(
  props: PageProps<"/me/maintenance/[requestId]/edit">,
) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <Edit params={props.params} />
    </Suspense>
  );
}

async function Edit({
  params,
}: Pick<PageProps<"/me/maintenance/[requestId]/edit">, "params">) {
  const { requestId } = await params;

  const [user, request] = await Promise.all([
    requireUser(),
    getMaintenanceRequest(requestId),
  ]);
  if (!request) notFound();

  // Cùng hai điều kiện mà `update_my_maintenance_request()` kiểm ở tầng database.
  // Kiểm lại ở đây không phải để bảo mật — hàm SQL mới là rào chắn — mà để người
  // mở link cũ thấy phiếu thay vì một form bấm Lưu là báo lỗi.
  if (request.reportedBy !== user.id || request.status !== "open") {
    redirect(`/me/maintenance/${requestId}`);
  }

  const action = updateMyRequest.bind(null, requestId);

  return (
    <div className="space-y-4">
      <PageHeader title="Sửa phiếu" description={`Phòng ${request.room.code}`} />

      <RequestForm
        action={action}
        request={request}
        cancelHref={`/me/maintenance/${requestId}`}
        submitLabel="Lưu thay đổi"
      />
    </div>
  );
}
