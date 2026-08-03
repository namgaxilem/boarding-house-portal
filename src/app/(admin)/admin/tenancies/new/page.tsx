import type { Metadata } from "next";
import Link from "next/link";
import { DoorOpenIcon, PlusIcon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { CheckInForm } from "@/features/tenancies/components/check-in-form";
import { db } from "@/lib/db";
import { toDateInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "Nhận phòng" };

export default async function CheckInPage(props: PageProps<"/admin/tenancies/new">) {
  const searchParams = await props.searchParams;

  const [allRooms, allTenants] = await Promise.all([db.listRooms(), db.listTenants()]);

  // Only rooms with a free slot, and only people who are not already renting —
  // the database rejects the alternatives anyway, so do not offer them.
  const rooms = allRooms.filter(
    (room) => room.status !== "maintenance" && room.occupants.length < room.maxOccupants,
  );
  const tenants = allTenants.filter(
    (tenant) => tenant.currentTenancy === null && tenant.isActive,
  );

  const roomId = typeof searchParams.roomId === "string" ? searchParams.roomId : undefined;
  const tenantId =
    typeof searchParams.tenantId === "string" ? searchParams.tenantId : undefined;

  const header = (
    <PageHeader
      title="Cho nhận phòng"
      description="Gán một người thuê vào phòng và mở hợp đồng mới."
      breadcrumbs={[
        { label: "Tổng quan", href: "/admin" },
        { label: "Phòng", href: "/admin/rooms" },
        { label: "Nhận phòng" },
      ]}
    />
  );

  if (rooms.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<DoorOpenIcon />}
          title="Không còn phòng nhận thêm người"
          description="Mọi phòng đều đã đủ người hoặc đang sửa chữa."
          action={
            <Button variant="outline" asChild>
              <Link href="/admin/rooms">Xem danh sách phòng</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<UsersIcon />}
          title="Không có người thuê nào đang chờ xếp phòng"
          description="Ai cũng đã có phòng. Tạo hồ sơ người thuê mới trước khi cho nhận phòng."
          action={
            <Button asChild>
              <Link href="/admin/tenants/new">
                <PlusIcon />
                Thêm người thuê
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <CheckInForm
        rooms={rooms}
        tenants={tenants}
        defaultRoomId={roomId}
        defaultTenantId={tenantId}
        today={toDateInputValue(new Date())}
      />
    </div>
  );
}
