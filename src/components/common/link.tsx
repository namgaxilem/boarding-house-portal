"use client";

import * as React from "react";
import NextLink, { useLinkStatus } from "next/link";

import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

/**
 * `<Link>` của Next kèm báo hiệu "đang chuyển trang".
 *
 * Dùng cái này ở mọi nơi thay cho `next/link` — import trong toàn bộ app đã được
 * đổi sang đây. Bên trong vẫn là `next/link`, chỉ thêm một component con vô hình
 * gọi `useLinkStatus()`.
 *
 * Vì sao phải là component CON chứ không gọi hook ngay trong wrapper?
 * `useLinkStatus` chỉ chạy được bên trong cây con của một `<Link>`. Gọi ở ngoài
 * luôn trả về `{ pending: false }`, im lặng, không báo lỗi gì.
 *
 * `NavigationBeacon` render ra `null` — không thêm một thẻ DOM nào. Điều đó quan
 * trọng: nhiều `<Link>` trong app là `flex` có `gap`, hoặc nằm trong `asChild`
 * của Button/DropdownMenuItem. Chèn thêm một `<span>` vô hình vào đó là lệch
 * khoảng cách hoặc vỡ Slot của Radix.
 */

function NavigationBeacon() {
  const { pending } = useLinkStatus();
  const trackNavigation = useUiStore((state) => state.trackNavigation);

  React.useEffect(() => {
    if (!pending) return;
    return trackNavigation();
  }, [pending, trackNavigation]);

  return null;
}

export function Link({ children, ...props }: React.ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <NavigationBeacon />
    </NextLink>
  );
}

/**
 * Chấm nhấp nháy hiện ngay tại link đang được bấm.
 *
 * Thanh tiến trình ở đầu màn hình trả lời "app có đang làm gì không". Chấm này
 * trả lời "cái mình vừa bấm có ăn không" — trên điện thoại, ngón tay che mất chỗ
 * vừa chạm nên phản hồi tại chỗ có giá trị hơn.
 *
 * Phải đặt bên trong một `<Link>`. Kích thước cố định và mặc định `opacity: 0`
 * để không đẩy chữ chạy khi trạng thái đổi (xem `.link-hint` trong globals.css).
 */
export function LinkPendingDot({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span aria-hidden className={cn("link-hint", pending && "is-pending", className)} />
  );
}
