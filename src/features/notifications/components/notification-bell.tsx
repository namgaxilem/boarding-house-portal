import { BellIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { countMyUnread } from "@/features/notifications/queries";

/**
 * Chuông thông báo ở header người thuê.
 *
 * Server Component: số chưa đọc lấy trực tiếp từ database khi render, không cần
 * JavaScript nào ở client và không có trạng thái nào để lệch. Bọc trong
 * <Suspense> ở layout để header không phải đợi truy vấn này.
 */
export async function NotificationBell() {
  const unread = await countMyUnread();

  return (
    <Link
      href="/me/notifications"
      aria-label={
        unread > 0 ? `Thông báo — ${unread} chưa đọc` : "Thông báo"
      }
      className="relative flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:size-9"
    >
      <BellIcon className="size-5" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

/** Chỗ giữ khung lúc chưa có số — cùng kích thước để header không nhảy. */
export function NotificationBellFallback() {
  return (
    <span
      aria-hidden
      className="flex size-10 items-center justify-center text-muted-foreground sm:size-9"
    >
      <BellIcon className="size-5" />
    </span>
  );
}
