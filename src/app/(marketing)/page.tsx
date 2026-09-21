import { Suspense } from "react";
import { Link } from "@/components/common/link";
import Image from "next/image";
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
import { listVacantRooms } from "@/lib/db/public-rooms";
import { formatVND } from "@/lib/format";
import { houseConfig, fullAddress, telHref } from "@/config/site";
import { pageMeta } from "@/lib/seo";
import { clampDescription } from "@/lib/structured-data";

/**
 * Tiêu đề trang chủ là KHẨU HIỆU chứ không phải tên nhà trọ.
 *
 * Người ta gõ "phòng trọ bình thạnh", không gõ "nhà trọ 1-47" — họ chưa biết
 * nhà trọ này tồn tại. Template ở layout gốc vẫn nối tên vào sau, nên kết quả
 * là "Phòng trọ sạch sẽ, an ninh, gần trung tâm · Nhà trọ 1-47": có từ khoá ở
 * đầu, có thương hiệu ở cuối, vừa dưới ngưỡng ~60 ký tự Google cắt chữ.
 */
export const metadata = pageMeta({
  title: houseConfig.tagline,
  // Google cắt mô tả quanh 155–160 ký tự. `houseConfig.description` + địa chỉ
  // dài 180, nên phần đuôi — chính là địa chỉ — bị cắt mất. Cắt chủ động ở ranh
  // giới từ để câu vẫn đọc được thay vì đứt giữa chữ.
  description: clampDescription(`${houseConfig.description} Địa chỉ ${fullAddress()}.`),
  path: "/",
});

// Vacancy comes from the database and changes whenever someone checks in or
// out, so it stays uncached. Under Cache Components everything outside the two
// <Suspense> boundaries below is prerendered into the static shell, which is what
// makes navigation into this page instant; the vacancy bits stream in after.
export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl space-y-6">
            <Badge variant="secondary" className="gap-1.5">
              <MapPinIcon />
              {/* `.filter(Boolean)`: `district` để rỗng trong config (sau khi
                  bỏ cấp quận, địa chỉ chỉ còn phường + thành phố) và nối thẳng
                  bằng dấu phẩy thì huy hiệu hiện ", Thành phố Hồ Chí Minh" —
                  thừa dấu phẩy ngay dòng địa chỉ, tức là ngay tín hiệu địa
                  phương quan trọng nhất của một trang cho thuê phòng. */}
              {[
                houseConfig.address.ward,
                houseConfig.address.district,
                houseConfig.address.city,
              ]
                .filter(Boolean)
                .join(", ")}
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

            <Suspense fallback={<p className="text-sm text-muted-foreground">Đang xem còn phòng…</p>}>
              <VacancySummary />
            </Suspense>
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
      <Suspense fallback={null}>
        <VacantRoomsPreview />
      </Suspense>

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

async function VacancySummary() {
  const vacantRooms = await listVacantRooms();
  if (vacantRooms.length === 0) return null;

  const cheapest = Math.min(...vacantRooms.map((room) => room.basePrice));

  return (
    <p className="text-sm text-muted-foreground">
      Hiện còn{" "}
      <strong className="text-foreground">{vacantRooms.length} phòng trống</strong> · từ{" "}
      {formatVND(cheapest)}/tháng
    </p>
  );
}

async function VacantRoomsPreview() {
  const vacantRooms = await listVacantRooms();
  if (vacantRooms.length === 0) return null;

  return (
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
          {vacantRooms.slice(0, 3).map((room, index) => (
            <li key={room.id}>
              <Card className="h-full overflow-hidden">
                {room.photos.length > 0 && (
                  <div className="relative aspect-4/3 bg-secondary">
                    <Image
                      src={room.photos[0].url}
                      alt={`Ảnh phòng ${room.code}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      // Chỉ tấm đầu — xem ghi chú cùng chỗ ở rooms/page.tsx.
                      priority={index === 0}
                      className="object-cover"
                    />
                  </div>
                )}
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    {/* <h3> dưới <h2> "Phòng đang trống": giữ đúng bậc h1→h2→h3,
                        không nhảy cấp. */}
                    <h3 className="flex items-center gap-2 font-semibold">
                      <DoorOpenIcon className="size-4 text-muted-foreground" />
                      Phòng {room.code}
                    </h3>
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
  );
}
