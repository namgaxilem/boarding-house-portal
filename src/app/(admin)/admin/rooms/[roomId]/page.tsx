import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LogInIcon,
  LogOutIcon,
  PencilIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { RoomStatusBadge } from "@/components/common/status-badge";
import { ConfirmForm } from "@/components/common/confirm-form";
import { RoomEventForm } from "@/features/rooms/components/room-event-form";
import { EventTimeline, TenancyHistory } from "@/features/rooms/components/room-timeline";
import { deleteRoom } from "@/features/rooms/actions";
import { db } from "@/lib/db";
import { formatDate, formatDuration, formatVND, toDateInputValue } from "@/lib/format";

export async function generateMetadata(
  props: PageProps<"/admin/rooms/[roomId]">,
): Promise<Metadata> {
  const { roomId } = await props.params;
  const room = await db.getRoom(roomId);
  return { title: room ? `Phòng ${room.code}` : "Phòng" };
}

export default async function RoomDetailPage(props: PageProps<"/admin/rooms/[roomId]">) {
  const { roomId } = await props.params;
  const searchParams = await props.searchParams;

  const room = await db.getRoom(roomId);
  if (!room) notFound();

  const [tenancies, events] = await Promise.all([
    db.listTenanciesByRoom(room.id),
    db.listRoomEvents(room.id),
  ]);

  const isFull = room.occupants.length >= room.maxOccupants;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Phòng ${room.code}`}
        description={`Tầng ${room.floor} · ${room.areaM2}m² · tối đa ${room.maxOccupants} người`}
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Phòng", href: "/admin/rooms" },
          { label: room.code },
        ]}
        actions={
          <>
            {!isFull && room.status !== "maintenance" && (
              <Button asChild>
                <Link href={`/admin/tenancies/new?roomId=${room.id}`}>
                  <LogInIcon />
                  Nhận phòng
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/admin/rooms/${room.id}/edit`}>
                <PencilIcon />
                Sửa
              </Link>
            </Button>
            <ConfirmForm
              action={deleteRoom}
              hidden={{ roomId: room.id }}
              title={`Xoá phòng ${room.code}?`}
              description="Toàn bộ lịch sử thuê và nhật ký của phòng sẽ mất theo. Không khôi phục được."
              triggerLabel={
                <>
                  <Trash2Icon />
                  Xoá
                </>
              }
              triggerProps={{
                className: "text-destructive hover:bg-destructive/10",
              }}
            />
          </>
        }
      />

      {searchParams.checkedIn === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã cho nhận phòng.</AlertDescription>
        </Alert>
      )}
      {searchParams.checkedOut === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã cho trả phòng. Lịch sử vẫn được giữ lại.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: facts + current occupants */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Thông tin</CardTitle>
              <RoomStatusBadge status={room.status} />
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Giá thuê</dt>
                <dd className="text-right font-medium tabular-nums">
                  {formatVND(room.basePrice)}
                </dd>

                <dt className="text-muted-foreground">Điện</dt>
                <dd className="text-right tabular-nums">
                  {formatVND(room.electricPrice)}/kWh
                </dd>

                <dt className="text-muted-foreground">Nước</dt>
                <dd className="text-right tabular-nums">
                  {formatVND(room.waterPrice)}/m³
                </dd>

                <dt className="text-muted-foreground">Dịch vụ</dt>
                <dd className="text-right tabular-nums">
                  {formatVND(room.servicePrice)}
                </dd>

                <dt className="text-muted-foreground">Sức chứa</dt>
                <dd className="text-right tabular-nums">
                  {room.occupants.length}/{room.maxOccupants} người
                </dd>
              </dl>

              {room.description && (
                <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                  {room.description}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Đang ở</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {room.occupants.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Phòng chưa có người ở.
                  </p>
                  {room.status !== "maintenance" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/tenancies/new?roomId=${room.id}`}>
                        <UsersIcon />
                        Cho người vào ở
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                room.occupants.map(({ tenancy, tenant }) => (
                  <div
                    key={tenancy.id}
                    className="space-y-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {tenant.fullName}
                      </Link>
                      {tenancy.isPrimary && <Badge variant="secondary">Đứng tên</Badge>}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Từ {formatDate(tenancy.startDate)} ·{" "}
                      {formatDuration(tenancy.startDate)}
                    </p>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {formatVND(tenancy.monthlyPrice)}/tháng · cọc{" "}
                      {formatVND(tenancy.deposit)}
                    </p>

                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link href={`/admin/tenancies/${tenancy.id}/checkout`}>
                        <LogOutIcon />
                        Cho trả phòng
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: history */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử thuê</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <TenancyHistory tenancies={tenancies} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nhật ký phòng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <RoomEventForm roomId={room.id} today={toDateInputValue(new Date())} />
              <EventTimeline events={events} roomId={room.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
