import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/common/page-header";
import { CheckOutForm } from "@/features/tenancies/components/check-out-form";
import { db } from "@/lib/db";
import { toDateInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "Trả phòng" };

export default async function CheckOutPage(
  props: PageProps<"/admin/tenancies/[tenancyId]/checkout">,
) {
  const { tenancyId } = await props.params;
  const tenancy = await db.getTenancy(tenancyId);
  if (!tenancy) notFound();

  const header = (
    <PageHeader
      title="Cho trả phòng"
      description={`${tenancy.tenant.fullName} · phòng ${tenancy.room.code}`}
      breadcrumbs={[
        { label: "Tổng quan", href: "/admin" },
        { label: "Phòng", href: "/admin/rooms" },
        { label: tenancy.room.code, href: `/admin/rooms/${tenancy.roomId}` },
        { label: "Trả phòng" },
      ]}
    />
  );

  if (tenancy.endDate !== null) {
    return (
      <div className="space-y-6">
        {header}
        <Alert variant="warning">
          <AlertDescription>
            Hợp đồng này đã kết thúc ngày {tenancy.endDate}. Không cần trả phòng lại.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <Alert variant="info">
        <AlertDescription>
          Hợp đồng vẫn được giữ lại sau khi trả phòng — đó chính là lịch sử của phòng.
        </AlertDescription>
      </Alert>
      <CheckOutForm tenancy={tenancy} today={toDateInputValue(new Date())} />
    </div>
  );
}
