import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  DoorOpenIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { houseConfig, fullAddress, telHref } from "@/config/site";

// Vacancy comes from the database and changes whenever someone checks in or
// out, so this page must not be frozen into the build output.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const vacantRooms = houseConfig.features.publicRoomList
    ? await db.listVacantRooms()
    : [];

  const cheapest =
    vacantRooms.length > 0
      ? Math.min(...vacantRooms.map((room) => room.basePrice))
      : null;

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl space-y-6">
            <Badge variant="secondary" className="gap-1.5">
              <MapPinIcon />
              {houseConfig.address.district}, {houseConfig.address.city}
            </Badge>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
                {houseConfig.tagline}
              </h1>
              <p className="text-base text-muted-foreground text-pretty sm:text-lg">
                {houseConfig.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/rooms">
                  Xem phòng trống
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={telHref(houseConfig.contact.phone)}>
                  <PhoneIcon />
                  Gọi {houseConfig.contact.phone}
                </a>
              </Button>
            </div>

            {vacantRooms.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Hiện còn{" "}
                <strong className="text-foreground">{vacantRooms.length} phòng trống</strong>
                {cheapest !== null && <> · từ {formatVND(cheapest)}/tháng</>}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Tiện ích</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {houseConfig.amenities.map((amenity) => (
            <li key={amenity}>
              <Card className="h-full">
                <CardContent className="flex items-start gap-3 p-4">
                  <span
                    aria-hidden
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                  >
                    <CheckIcon className="size-3" />
                  </span>
                  <span className="text-sm">{amenity}</span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* Vacant rooms preview */}
      {vacantRooms.length > 0 && (
        <section className="border-t border-border bg-secondary/30">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Phòng đang trống
              </h2>
              <Button variant="ghost" asChild>
                <Link href="/rooms">
                  Xem tất cả
                  <ArrowRightIcon />
                </Link>
              </Button>
            </div>

            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vacantRooms.slice(0, 3).map((room) => (
                <li key={room.id}>
                  <Card className="h-full">
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-semibold">
                          <DoorOpenIcon className="size-4 text-muted-foreground" />
                          {room.code}
                        </span>
                        <Badge variant="success">Còn trống</Badge>
                      </div>
                      <p className="text-lg font-semibold text-primary tabular-nums">
                        {formatVND(room.basePrice)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /tháng
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Tầng {room.floor} · {room.areaM2}m² · tối đa {room.maxOccupants}{" "}
                        người
                      </p>
                      {room.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {room.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Contact strip */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Muốn xem phòng trực tiếp?</h2>
            <p className="text-sm text-muted-foreground">{fullAddress()}</p>
          </div>
          <Button asChild>
            <Link href="/contact">
              Thông tin liên hệ
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
