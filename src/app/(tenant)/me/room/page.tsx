import { Suspense } from "react";
import type { Metadata } from "next";
import { DropletIcon, ZapIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { NoRoomNotice } from "@/components/common/no-room-notice";
import { PhotoGallery } from "@/features/rooms/components/photo-gallery";
import { getMyTenancy } from "@/features/tenants/queries";
import { listReadingsForRoom } from "@/features/meters/queries";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  formatDate,
  formatDuration,
  formatMonthYear,
  formatNumber,
  formatVND,
  initials,
} from "@/lib/format";
import { electricUsed, waterUsed } from "@/lib/period";

export const metadata: Metadata = { title: "Phòng của tôi" };

export const instant = true;

export default function MyRoomPage() {
  return (
    <Suspense fallback={<RoomSkeleton />}>
      <RoomDetail />
    </Suspense>
  );
}

function RoomSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="aspect-4/3 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
}

async function RoomDetail() {
  const user = await requireUser();
  const tenancy = await getMyTenancy();

  if (!tenancy) return <NoRoomNotice />;

  const [roommates, photos, readings] = await Promise.all([
    db.listMyRoommates(user.id),
    db.listRoomPhotos(tenancy.roomId),
    // Người thuê đọc được chỉ số của chính phòng mình (policy
    // `meter_readings_select`) — để họ tự đối chiếu với đồng hồ ngoài hành lang.
    listReadingsForRoom(tenancy.roomId, 6),
  ]);

  return (
    <div className="space-y-4">
      <PhotoGallery photos={photos} roomCode={tenancy.room.code} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Phòng {tenancy.room.code}</CardTitle>
          {tenancy.isPrimary && <Badge variant="secondary">Bạn đứng tên</Badge>}
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Tầng</dt>
            <dd className="text-right tabular-nums">{tenancy.room.floor}</dd>

            <dt className="text-muted-foreground">Diện tích</dt>
            <dd className="text-right tabular-nums">{tenancy.room.areaM2} m²</dd>

            <dt className="text-muted-foreground">Ngày nhận phòng</dt>
            <dd className="text-right">{formatDate(tenancy.startDate)}</dd>

            <dt className="text-muted-foreground">Đã ở</dt>
            <dd className="text-right">{formatDuration(tenancy.startDate)}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chi phí hàng tháng</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Tiền phòng</dt>
            <dd className="text-right font-semibold tabular-nums">
              {formatVND(tenancy.monthlyPrice)}
            </dd>

            <dt className="text-muted-foreground">Tiền điện</dt>
            <dd className="text-right tabular-nums">
              {formatVND(tenancy.room.electricPrice)} / kWh
            </dd>

            <dt className="text-muted-foreground">Tiền nước</dt>
            <dd className="text-right tabular-nums">
              {formatVND(tenancy.room.waterPrice)} / m³
            </dd>

            <dt className="text-muted-foreground">Phí dịch vụ</dt>
            <dd className="text-right tabular-nums">
              {formatVND(tenancy.room.servicePrice)}
            </dd>

            <dt className="border-t border-border pt-3 text-muted-foreground">
              Tiền cọc đã đóng
            </dt>
            <dd className="border-t border-border pt-3 text-right tabular-nums">
              {formatVND(tenancy.deposit)}
            </dd>
          </dl>

          <p className="mt-4 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            Tiền điện nước tính theo chỉ số thực tế hàng tháng, chưa bao gồm trong tiền
            phòng.
          </p>
        </CardContent>
      </Card>

      {readings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chỉ số điện nước</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-3 text-sm">
              {readings.map((reading) => (
                <li
                  key={reading.id}
                  className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <span className="font-medium tabular-nums">
                    {formatMonthYear(reading.period)}
                  </span>
                  <span className="flex items-center gap-3 text-muted-foreground tabular-nums">
                    <span className="flex items-center gap-1">
                      <ZapIcon className="size-3.5" aria-hidden />
                      {formatNumber(electricUsed(reading))} kWh
                    </span>
                    <span className="flex items-center gap-1">
                      <DropletIcon className="size-3.5" aria-hidden />
                      {formatNumber(waterUsed(reading))} m³
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Số ghi ở cột trên là lượng đã dùng trong tháng. Thấy lệch so với đồng hồ thì
              nhắn cho chủ trọ để đọc lại.
            </p>
          </CardContent>
        </Card>
      )}

      {tenancy.room.description && (
        <Card>
          <CardHeader>
            <CardTitle>Mô tả phòng</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{tenancy.room.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Người ở cùng</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {roommates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bạn đang ở một mình.</p>
          ) : (
            <ul className="space-y-3">
              {roommates.map((roommate) => (
                <li key={roommate.id} className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(roommate.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{roommate.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      Ở từ {formatDate(roommate.startDate)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
