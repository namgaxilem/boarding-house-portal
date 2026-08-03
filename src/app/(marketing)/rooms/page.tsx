import type { Metadata } from "next";
import { DoorOpenIcon, PhoneIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { houseConfig, telHref } from "@/config/site";

export const metadata: Metadata = { title: "Phòng trống" };

export const dynamic = "force-dynamic";

export default async function PublicRoomsPage() {
  const rooms = houseConfig.features.publicRoomList ? await db.listVacantRooms() : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Phòng đang trống
        </h1>
        <p className="text-muted-foreground">
          {rooms.length > 0
            ? `Còn ${rooms.length} phòng. Gọi ${houseConfig.contact.phone} để hẹn xem phòng.`
            : "Hiện chưa có phòng trống."}
        </p>
      </header>

      {rooms.length === 0 ? (
        <EmptyState
          icon={<DoorOpenIcon />}
          title="Hết phòng trống"
          description="Để lại số điện thoại, chủ trọ sẽ báo khi có phòng mới."
          action={
            <Button asChild>
              <a href={telHref(houseConfig.contact.phone)}>
                <PhoneIcon />
                Gọi {houseConfig.contact.phone}
              </a>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <li key={room.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold">{room.code}</span>
                    <Badge variant="success">Còn trống</Badge>
                  </div>

                  <p className="text-xl font-semibold text-primary tabular-nums">
                    {formatVND(room.basePrice)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /tháng
                    </span>
                  </p>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <dt className="text-muted-foreground">Tầng</dt>
                    <dd className="text-right tabular-nums">{room.floor}</dd>

                    <dt className="text-muted-foreground">Diện tích</dt>
                    <dd className="text-right tabular-nums">{room.areaM2} m²</dd>

                    <dt className="text-muted-foreground">Tối đa</dt>
                    <dd className="text-right tabular-nums">{room.maxOccupants} người</dd>

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
                      {formatVND(room.servicePrice)}/tháng
                    </dd>
                  </dl>

                  {room.description && (
                    <p className="text-sm text-muted-foreground">{room.description}</p>
                  )}

                  <Button variant="outline" asChild className="mt-auto">
                    <a href={telHref(houseConfig.contact.phone)}>
                      <PhoneIcon />
                      Hẹn xem phòng
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
