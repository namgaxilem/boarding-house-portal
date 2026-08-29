import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { updateRequestAsAdmin } from "@/features/maintenance/actions";
import { RequestForm } from "@/features/maintenance/components/request-form";
import { getMaintenanceRequest } from "@/features/maintenance/queries";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Sửa phiếu báo hỏng" };

export const instant = true;

export default function EditMaintenancePage(
  props: PageProps<"/admin/maintenance/[requestId]/edit">,
) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <Edit params={props.params} />
    </Suspense>
  );
}

async function Edit({
  params,
}: Pick<PageProps<"/admin/maintenance/[requestId]/edit">, "params">) {
  const { requestId } = await params;

  const [request, rooms] = await Promise.all([
    getMaintenanceRequest(requestId),
    db.listRooms(),
  ]);
  if (!request) notFound();

  // `bind` chứ không phải input ẩn: id phiếu là thứ quyết định sửa dòng nào, và
  // nó không nên đi qua form nơi người dùng đổi được.
  const action = updateRequestAsAdmin.bind(null, requestId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sửa phiếu"
        description={`Phòng ${request.room.code} · ${request.title}`}
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Báo hỏng", href: "/admin/maintenance" },
          { label: request.room.code, href: `/admin/maintenance/${requestId}` },
          { label: "Sửa" },
        ]}
      />

      <RequestForm
        action={action}
        request={request}
        rooms={rooms}
        cancelHref={`/admin/maintenance/${requestId}`}
        submitLabel="Lưu thay đổi"
      />
    </div>
  );
}
