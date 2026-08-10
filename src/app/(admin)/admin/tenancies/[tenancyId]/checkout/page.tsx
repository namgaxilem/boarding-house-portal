import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { CheckOutForm } from "@/features/tenancies/components/check-out-form";
import { db } from "@/lib/db";
import { toDateInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "Trả phòng" };

// Tên người thuê và mã phòng nằm cả trong mô tả lẫn breadcrumb, nên cả trang phụ
// thuộc dữ liệu: bọc <Suspense> để bấm "Trả phòng" là đổi khung ngay, form và
// ngày hôm nay (chỉ biết lúc có request) stream vào sau.
export const instant = true;

export default function CheckOutPage(
  props: PageProps<"/admin/tenancies/[tenancyId]/checkout">,
) {
  return (
    <Suspense fallback={<CheckOutSkeleton />}>
      <CheckOut params={props.params} />
    </Suspense>
  );
}

function CheckOutSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-16 w-full max-w-md rounded-md" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

async function CheckOut({
  params,
}: Pick<PageProps<"/admin/tenancies/[tenancyId]/checkout">, "params">) {
  const { tenancyId } = await params;
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
