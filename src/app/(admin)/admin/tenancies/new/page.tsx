import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/components/common/link";
import { DoorOpenIcon, PlusIcon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { CheckInForm } from "@/features/tenancies/components/check-in-form";
import { db } from "@/lib/db";
import { toDateInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "Nhận phòng" };

// Header nằm trong shell tĩnh; danh sách phòng trống + người chờ xếp phòng (và
// ngày hôm nay, vốn phải tính lúc có request) stream sau.
export const instant = true;

export default function CheckInPage(props: PageProps<"/admin/tenancies/new">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cho nhận phòng"
        description="Gán một người thuê vào phòng và mở hợp đồng mới."
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Phòng", href: "/admin/rooms" },
          { label: "Nhận phòng" },
        ]}
      />

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <CheckIn searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function CheckIn({
  searchParams,
}: Pick<PageProps<"/admin/tenancies/new">, "searchParams">) {
  const [allRooms, allTenants] = await Promise.all([db.listRooms(), db.listTenants()]);

  // Only rooms with a free slot, and only people who are not already renting —
  // the database rejects the alternatives anyway, so do not offer them.
  const rooms = allRooms.filter(
    (room) => room.status !== "maintenance" && room.occupants.length < room.maxOccupants,
  );
  const tenants = allTenants.filter(
    (tenant) => tenant.currentTenancy === null && tenant.isActive,
  );

  if (rooms.length === 0) {
    return (
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
    );
  }

  if (tenants.length === 0) {
    return (
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
    );
  }

  const { roomId: rawRoomId, tenantId: rawTenantId } = await searchParams;

  return (
    <CheckInForm
      rooms={rooms}
      tenants={tenants}
      defaultRoomId={typeof rawRoomId === "string" ? rawRoomId : undefined}
      defaultTenantId={typeof rawTenantId === "string" ? rawTenantId : undefined}
      today={toDateInputValue(new Date())}
    />
  );
}
