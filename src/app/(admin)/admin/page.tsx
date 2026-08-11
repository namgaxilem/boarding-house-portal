import type { Metadata } from "next";
import { Link } from "@/components/common/link";
import { Suspense } from "react";
import {
  ArrowRightIcon,
  BanknoteIcon,
  DoorOpenIcon,
  PlusIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { RoomStatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { db } from "@/lib/db";
import { formatCompactVND, formatDateTime, formatVND } from "@/lib/format";
import { ROOM_EVENT_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Tổng quan" };

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan"
        description="Tình trạng 10 phòng và hoạt động gần đây."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/tenancies/new">Nhận phòng</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/rooms/new">
                <PlusIcon />
                Thêm phòng
              </Link>
            </Button>
          </>
        }
      />

      {/* Each block streams in on its own so a slow query cannot hold the page. */}
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
            <RoomOverview />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
            <RecentActivity />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function Stats() {
  const stats = await db.getAdminStats();

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Đang ở"
        value={`${stats.occupiedRooms}/${stats.totalRooms}`}
        sublabel={`Lấp đầy ${Math.round(stats.occupancyRate * 100)}%`}
        icon={<DoorOpenIcon />}
        accent="success"
        href="/admin/rooms"
      />
      <StatCard
        label="Còn trống"
        value={String(stats.vacantRooms)}
        sublabel={stats.maintenanceRooms > 0 ? `${stats.maintenanceRooms} phòng đang sửa` : "Không có phòng sửa"}
        icon={<WrenchIcon />}
        accent={stats.vacantRooms > 0 ? "warning" : "default"}
        href="/admin/rooms"
      />
      <StatCard
        label="Người thuê"
        value={String(stats.activeTenants)}
        sublabel="Đang ở tại nhà trọ"
        icon={<UsersIcon />}
        accent="info"
        href="/admin/tenants"
      />
      <StatCard
        label="Tiền phòng / tháng"
        value={formatCompactVND(stats.monthlyRevenue)}
        sublabel={formatVND(stats.monthlyRevenue)}
        icon={<BanknoteIcon />}
      />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[74px] rounded-xl" />
      ))}
    </div>
  );
}

async function RoomOverview() {
  const rooms = await db.listRooms();

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Sơ đồ phòng</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/rooms">
            Chi tiết
            <ArrowRightIcon />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="pt-4">
        {rooms.length === 0 ? (
          <EmptyState
            icon={<DoorOpenIcon />}
            title="Chưa có phòng nào"
            description="Thêm phòng đầu tiên để bắt đầu quản lý."
            action={
              <Button asChild>
                <Link href="/admin/rooms/new">
                  <PlusIcon />
                  Thêm phòng
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {rooms.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/admin/rooms/${room.id}`}
                  className="flex h-full flex-col gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold">{room.code}</span>
                    <span className="text-xs text-muted-foreground">T{room.floor}</span>
                  </div>
                  <RoomStatusBadge status={room.status} className="w-fit" />
                  <p className="truncate text-xs text-muted-foreground">
                    {room.occupants.length > 0
                      ? room.occupants.map((o) => o.tenant.fullName).join(", ")
                      : formatVND(room.basePrice)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

async function RecentActivity() {
  const events = await db.listRecentEvents(8);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Hoạt động gần đây</CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
        ) : (
          <ol className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/60"
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium leading-snug">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <Link
                      href={`/admin/rooms/${event.room.id}`}
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      {event.room.code}
                    </Link>{" "}
                    · {ROOM_EVENT_LABEL[event.type]} · {formatDateTime(event.occurredAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
