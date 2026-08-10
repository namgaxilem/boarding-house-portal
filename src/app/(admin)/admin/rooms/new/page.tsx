import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { RoomForm } from "@/features/rooms/components/room-form";

export const metadata: Metadata = { title: "Thêm phòng" };

// Form trống, mặc định lấy từ config — không đọc DB nên trang này tĩnh.
export const instant = true;

export default function NewRoomPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Thêm phòng"
        description="Đơn giá điện, nước, dịch vụ lấy mặc định từ src/config/site.ts."
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Phòng", href: "/admin/rooms" },
          { label: "Thêm phòng" },
        ]}
      />
      <RoomForm />
    </div>
  );
}
