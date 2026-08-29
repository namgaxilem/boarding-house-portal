import { Suspense } from "react";
import type { Metadata } from "next";
import { PlusIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { LandlordContact } from "@/components/common/landlord-contact";
import { NoRoomNotice } from "@/components/common/no-room-notice";
import { RequestList } from "@/features/maintenance/components/request-list";
import { listMyMaintenanceRequests } from "@/features/maintenance/queries";
import { getMyTenancy } from "@/features/tenants/queries";

export const metadata: Metadata = { title: "Báo hỏng" };

export const instant = true;

export default function MyMaintenancePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Báo hỏng"
        description="Gửi cho chủ trọ và theo dõi tới lúc sửa xong."
      />

      <Suspense fallback={<ListSkeleton />}>
        <MyRequests />
      </Suspense>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 2 }).map((_, index) => (
        <Skeleton key={index} className="h-[104px] w-full rounded-xl" />
      ))}
    </div>
  );
}

async function MyRequests() {
  const [tenancy, requests] = await Promise.all([
    getMyTenancy(),
    listMyMaintenanceRequests(),
  ]);

  // Chưa được xếp phòng thì không gửi được phiếu — phòng suy ra từ hợp đồng.
  if (!tenancy) {
    return <NoRoomNotice />;
  }

  return (
    <div className="space-y-4">
      <Button asChild className="w-full">
        <Link href="/me/maintenance/new">
          <PlusIcon />
          Báo hỏng mới
        </Link>
      </Button>

      <RequestList
        requests={requests}
        basePath="/me/maintenance"
        showRoom={false}
        emptyTitle="Chưa có phiếu nào"
        emptyDescription="Hỏng hóc gì trong phòng thì bấm “Báo hỏng mới”. Chủ trọ nhận thông báo ngay, và bạn theo dõi được tới lúc sửa xong."
      />

      {requests.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Danh sách gồm cả phiếu do người ở cùng phòng gửi — để hai người không báo
          trùng một cái hỏng.
        </p>
      )}

      {/* Số điện thoại chủ trọ nằm NGAY ĐÂY, không phải sau hai lần chạm. Trang
          này được mở đúng lúc có thứ hỏng, và có những thứ hỏng thì không nên gửi
          phiếu rồi ngồi chờ. */}
      <LandlordContact variant="urgent" />
    </div>
  );
}
