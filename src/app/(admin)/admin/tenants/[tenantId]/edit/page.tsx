import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { TenantForm } from "@/features/tenants/components/tenant-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Sửa hồ sơ người thuê" };

// Tên người thuê nằm ngay trên tiêu đề và breadcrumb nên cả trang phụ thuộc dữ
// liệu; bọc <Suspense> để khung trang hiện ngay khi bấm từ trang chi tiết sang.
export const instant = true;

export default function EditTenantPage(
  props: PageProps<"/admin/tenants/[tenantId]/edit">,
) {
  return (
    <Suspense fallback={<EditSkeleton />}>
      <EditTenant params={props.params} />
    </Suspense>
  );
}

function EditSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-16 w-full max-w-md rounded-md" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

async function EditTenant({
  params,
}: Pick<PageProps<"/admin/tenants/[tenantId]/edit">, "params">) {
  const { tenantId } = await params;
  const tenant = await db.getTenant(tenantId);
  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sửa hồ sơ ${tenant.fullName}`}
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Người thuê", href: "/admin/tenants" },
          { label: tenant.fullName, href: `/admin/tenants/${tenant.id}` },
          { label: "Sửa" },
        ]}
      />
      <TenantForm tenant={tenant} />
    </div>
  );
}
