import { Suspense } from "react";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { createRequestAsAdmin } from "@/features/maintenance/actions";
import { RequestForm } from "@/features/maintenance/components/request-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Ghi phiếu báo hỏng" };

export const instant = true;

export default function NewMaintenancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ghi phiếu báo hỏng"
        description="Dùng khi người thuê gọi điện, hoặc khi bạn tự phát hiện."
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Báo hỏng", href: "/admin/maintenance" },
          { label: "Ghi phiếu" },
        ]}
      />

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  const rooms = await db.listRooms();

  return (
    <RequestForm
      action={createRequestAsAdmin}
      rooms={rooms}
      cancelHref="/admin/maintenance"
      submitLabel="Tạo phiếu"
    />
  );
}
