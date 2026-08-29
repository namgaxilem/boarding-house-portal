import { Suspense } from "react";
import type { Metadata } from "next";
import {
  ClockIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentMethods } from "@/features/payments/components/payment-methods";
import { getMyTenancy } from "@/features/tenants/queries";
import { houseConfig, fullAddress, telHref, zaloHref } from "@/config/site";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Liên hệ chủ trọ" };

// Toàn bộ trang lấy từ config nên prerender được; chỉ nội dung chuyển khoản cần
// biết mã phòng của người đang đăng nhập, phần đó stream sau.
export const instant = true;

export default function MyContactPage() {
  const { contact, address } = houseConfig;

  return (
    <div className="space-y-4">
      {/* Big tap targets first — this page exists for the moment something breaks. */}
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" asChild className="h-auto flex-col gap-1.5 py-4">
          <a href={telHref(contact.phone)}>
            <PhoneIcon className="size-5" />
            <span className="text-xs font-normal opacity-90">Gọi chủ trọ</span>
          </a>
        </Button>

        {contact.zalo ? (
          <Button size="lg" variant="outline" asChild className="h-auto flex-col gap-1.5 py-4">
            <a href={zaloHref(contact.zalo)} target="_blank" rel="noopener noreferrer">
              <MessageCircleIcon className="size-5" />
              <span className="text-xs font-normal opacity-90">Nhắn Zalo</span>
            </a>
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            asChild
            className="h-auto flex-col gap-1.5 py-4"
          >
            <a href={`mailto:${contact.email}`}>
              <MessageCircleIcon className="size-5" />
              <span className="text-xs font-normal opacity-90">Gửi email</span>
            </a>
          </Button>
        )}
      </div>

      <Card className="border-destructive/25 bg-destructive/5">
        <CardContent className="flex items-center gap-3 p-4">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
          >
            <TriangleAlertIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Số khẩn cấp</p>
            <p className="text-xs text-muted-foreground">Cháy, rò điện, ngập nước</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={telHref(contact.emergencyPhone)}>
              {formatPhone(contact.emergencyPhone)}
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin chủ trọ</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Tên</dt>
            <dd className="text-right">{contact.ownerName}</dd>

            <dt className="text-muted-foreground">Điện thoại</dt>
            <dd className="text-right tabular-nums">{formatPhone(contact.phone)}</dd>

            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all text-right">{contact.email}</dd>

            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <ClockIcon className="size-3.5" />
              Giờ liên hệ
            </dt>
            <dd className="text-right">{contact.officeHours}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Địa chỉ nhà trọ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <p className="text-sm">{fullAddress()}</p>
          {address.mapUrl && (
            <Button variant="outline" size="sm" asChild className="w-full">
              <a href={address.mapUrl} target="_blank" rel="noopener noreferrer">
                <MapPinIcon />
                Mở Google Maps
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Số tài khoản và ảnh QR lấy từ /admin/settings/payments, không từ file
          cấu hình — chủ trọ đổi ngân hàng thì trang này đổi theo ngay. */}
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <MyPaymentMethods />
      </Suspense>
    </div>
  );
}

async function MyPaymentMethods() {
  const tenancy = await getMyTenancy();

  // Điền sẵn nội dung chuyển khoản để người thuê khỏi gõ lại mỗi tháng. Chưa được
  // xếp phòng thì bỏ trống còn hơn gợi ý một cú pháp sai.
  return (
    <PaymentMethods
      title="Đóng tiền phòng"
      transferNote={tenancy ? `${tenancy.room.code} tien phong` : undefined}
    />
  );
}
