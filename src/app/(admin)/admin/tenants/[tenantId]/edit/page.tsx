import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { TenantForm } from "@/features/tenants/components/tenant-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Sửa hồ sơ người thuê" };

export default async function EditTenantPage(
  props: PageProps<"/admin/tenants/[tenantId]/edit">,
) {
  const { tenantId } = await props.params;
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
