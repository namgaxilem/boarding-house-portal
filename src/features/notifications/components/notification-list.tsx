import {
  BellIcon,
  CheckCheckIcon,
  ReceiptTextIcon,
  BanknoteIcon,
  ClockIcon,
  WrenchIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import {
  markAllNotificationsRead,
  openNotification,
} from "@/features/notifications/actions";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types";

const ICON: Record<NotificationType, typeof BellIcon> = {
  invoice_issued: ReceiptTextIcon,
  invoice_paid: BanknoteIcon,
  invoice_due: ClockIcon,
  maintenance_new: WrenchIcon,
  maintenance_update: WrenchIcon,
  general: BellIcon,
};

const ICON_STYLE: Record<NotificationType, string> = {
  invoice_issued: "bg-info/12 text-info",
  invoice_paid: "bg-success/12 text-success",
  invoice_due: "bg-warning/15 text-warning-foreground dark:text-warning",
  maintenance_new: "bg-warning/15 text-warning-foreground dark:text-warning",
  maintenance_update: "bg-info/12 text-info",
  general: "bg-secondary text-muted-foreground",
};

export function NotificationList({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<BellIcon />}
        title="Chưa có thông báo nào"
        description="Hoá đơn mới và nhắc đóng tiền sẽ xuất hiện ở đây, đồng thời gửi vào email của bạn."
      />
    );
  }

  const unread = notifications.filter((item) => item.readAt === null).length;

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <form action={markAllNotificationsRead} className="flex justify-end">
          <Button type="submit" variant="ghost" size="sm">
            <CheckCheckIcon />
            Đánh dấu tất cả đã đọc ({unread})
          </Button>
        </form>
      )}

      <ul className="space-y-2">
        {notifications.map((item) => {
          const Icon = ICON[item.type];
          const unreadItem = item.readAt === null;

          return (
            <li key={item.id}>
              {/* Cả thẻ là một nút submit: chạm vào đâu cũng vừa đánh dấu đã đọc
                  vừa mở đúng trang liên quan. */}
              <form action={openNotification}>
                <input type="hidden" name="notificationId" value={item.id} />
                <input type="hidden" name="link" value={item.link ?? ""} />
                <button type="submit" className="w-full text-left">
                  <Card
                    className={cn(
                      "transition-colors hover:border-primary/40 hover:bg-accent/30",
                      unreadItem && "border-primary/30 bg-accent/20",
                    )}
                  >
                    <CardContent className="flex items-start gap-3 p-4">
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          ICON_STYLE[item.type],
                        )}
                      >
                        <Icon className="size-4" />
                      </span>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            unreadItem ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.title}
                        </p>
                        {item.body && (
                          <p className="text-sm text-muted-foreground">{item.body}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(item.createdAt)}
                          {item.emailSentAt && " · đã gửi email"}
                        </p>
                      </div>

                      {unreadItem && (
                        <span
                          aria-label="Chưa đọc"
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </CardContent>
                  </Card>
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
