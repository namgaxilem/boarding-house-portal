import { Suspense } from "react";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { LandlordContact } from "@/components/common/landlord-contact";
import { NoRoomNotice } from "@/components/common/no-room-notice";
import { createMyRequest } from "@/features/maintenance/actions";
import { RequestForm } from "@/features/maintenance/components/request-form";
import { getMyTenancy } from "@/features/tenants/queries";

export const metadata: Metadata = { title: "Báo hỏng mới" };

export const instant = true;

export default function NewMyRequestPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Báo hỏng mới"
        description="Chủ trọ nhận thông báo ngay khi bạn gửi."
      />

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  const tenancy = await getMyTenancy();
  if (!tenancy) return <NoRoomNotice />;

  // Không truyền `rooms`: phòng được suy ra ở server từ hợp đồng đang hiệu lực.
  return (
    <div className="space-y-4">
      <RequestForm
        action={createMyRequest}
        cancelHref="/me/maintenance"
        submitLabel="Gửi cho chủ trọ"
      />

      {/* Gửi xong mới đính được ảnh — phiếu phải tồn tại trước đã. Nói trước ở
          đây để không ai đi tìm nút "chọn ảnh" trong form này. */}
      <p className="text-xs text-muted-foreground">
        Gửi xong bạn sẽ thêm được ảnh chỗ hỏng ở trang chi tiết phiếu.
      </p>

      <LandlordContact variant="urgent" />
    </div>
  );
}
