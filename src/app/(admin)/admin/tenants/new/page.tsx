import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { TenantForm } from "@/features/tenants/components/tenant-form";

export const metadata: Metadata = { title: "Thêm người thuê" };

export default function NewTenantPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Thêm người thuê"
        description="Tạo hồ sơ và tài khoản đăng nhập. Xếp phòng ở bước sau."
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Người thuê", href: "/admin/tenants" },
          { label: "Thêm" },
        ]}
      />
      <TenantForm />
    </div>
  );
}
