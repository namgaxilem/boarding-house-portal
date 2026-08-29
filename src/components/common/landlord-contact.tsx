import { ClockIcon, MessageCircleIcon, PhoneIcon, TriangleAlertIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { houseConfig, telHref, zaloHref } from "@/config/site";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Liên hệ chủ trọ, dạng gọn — đặt được vào bất kỳ trang nào của người thuê.
 *
 * Trang `/me/contact` là nơi người ta VÀO TÌM khi bình tĩnh. Thẻ này là cho lúc
 * người ta đang đứng trước cái vòi phun nước: số điện thoại phải nằm ngay trên
 * màn hình đang mở, không phải sau hai lần chạm.
 *
 * Đọc từ `houseConfig` chứ không từ database: tên và số điện thoại chủ trọ gần
 * như không đổi, và một trang liên hệ phụ thuộc vào truy vấn là một trang có thể
 * trắng đúng lúc cần nhất.
 */
export function LandlordContact({
  variant = "default",
  className,
}: {
  /** `"urgent"` tô cảnh báo và đẩy số khẩn cấp lên trước. */
  variant?: "default" | "urgent";
  className?: string;
}) {
  const { contact, name } = houseConfig;
  const urgent = variant === "urgent";

  return (
    <Card className={cn(urgent && "border-destructive/30 bg-destructive/5", className)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          {urgent && (
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          )}
          <div className="min-w-0">
            <p className="font-medium">
              {urgent ? "Việc gấp thì gọi ngay" : `Liên hệ ${contact.ownerName}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {urgent
                ? "Rò điện, ngập nước, cháy nổ — gọi trước, gửi phiếu sau."
                : `Chủ ${name}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* `tel:` và Zalo là link thật, không phải nút gọi Server Action: chúng
              phải mở được cả khi mạng chập, và app điện thoại xử lý phần còn lại. */}
          <Button asChild variant={urgent ? "destructive" : "default"} size="sm">
            <a href={telHref(urgent ? contact.emergencyPhone : contact.phone)}>
              <PhoneIcon />
              {urgent ? "Số khẩn cấp" : "Gọi"}
            </a>
          </Button>

          {contact.zalo ? (
            <Button asChild variant="outline" size="sm">
              <a href={zaloHref(contact.zalo)} target="_blank" rel="noopener noreferrer">
                <MessageCircleIcon />
                Zalo
              </a>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <a href={telHref(contact.emergencyPhone)}>
                <PhoneIcon />
                Số khẩn cấp
              </a>
            </Button>
          )}
        </div>

        <dl className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <dt>{urgent ? "Số khẩn cấp" : "Điện thoại"}</dt>
            <dd className="tabular-nums text-foreground">
              {formatPhone(urgent ? contact.emergencyPhone : contact.phone)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1">
              <ClockIcon className="size-3" />
              Giờ tiếp
            </dt>
            <dd className="text-right text-foreground">{contact.officeHours}</dd>
          </div>
        </dl>

        <Link
          href="/me/contact"
          className="inline-block text-xs underline underline-offset-4 hover:text-foreground"
        >
          Xem đầy đủ thông tin nhà trọ →
        </Link>
      </CardContent>
    </Card>
  );
}
