import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { DoorOpenIcon, ImageOffIcon, PhoneIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { listVacantRooms } from "@/lib/db/public-rooms";
import { formatVND } from "@/lib/format";
import { houseConfig, telHref } from "@/config/site";

export const metadata: Metadata = { title: "Phòng trống" };

// Tiêu đề là tĩnh nên vào trang này hiện ngay; số phòng và danh sách phòng đọc DB
// nên nằm trong <Suspense> và stream sau.
export default function PublicRoomsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Phòng đang trống
        </h1>
        <Suspense
          fallback={<p className="text-muted-foreground">Đang tải danh sách phòng…</p>}
        >
          <VacancyLine />
        </Suspense>
      </header>

      <Suspense fallback={<RoomGridSkeleton />}>
        <RoomGrid />
      </Suspense>
    </div>
  );
}

async function VacancyLine() {
  const rooms = await listVacantRooms();

  return (
    <p className="text-muted-foreground">
      {rooms.length > 0
        ? `Còn ${rooms.length} phòng. Gọi ${houseConfig.contact.phone} để hẹn xem phòng.`
        : "Hiện chưa có phòng trống."}
    </p>
  );
}

function RoomGridSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Card className="h-full overflow-hidden">
            <div className="aspect-4/3 animate-pulse bg-secondary" />
            <CardContent className="space-y-3 p-5">
              <div className="h-5 w-24 animate-pulse rounded bg-secondary" />
              <div className="h-6 w-32 animate-pulse rounded bg-secondary" />
              <div className="h-24 animate-pulse rounded bg-secondary" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

async function RoomGrid() {
  const rooms = await listVacantRooms();

  return (
    <>
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
              <Card className="h-full overflow-hidden">
                {room.photos.length > 0 ? (
                  <div className="relative aspect-4/3 bg-secondary">
                    <Image
                      src={room.photos[0].url}
                      alt={`Ảnh phòng ${room.code}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                    {room.photos.length > 1 && (
                      <Badge
                        variant="secondary"
                        className="absolute bottom-2 right-2 bg-background/85 backdrop-blur"
                      >
                        {room.photos.length} ảnh
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-4/3 items-center justify-center bg-secondary text-muted-foreground">
                    <ImageOffIcon className="size-6" />
                  </div>
                )}

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
    </>
  );
}
