import { Suspense } from "react";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { listMyNotifications } from "@/features/notifications/queries";

export const metadata: Metadata = { title: "Thông báo" };

export const instant = true;

export default function NotificationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Thông báo"
        description="Hoá đơn mới, nhắc đóng tiền và xác nhận đã nhận tiền."
      />

      <Suspense fallback={<ListSkeleton />}>
        <Notifications />
      </Suspense>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[88px] w-full rounded-xl" />
      ))}
    </div>
  );
}

async function Notifications() {
  const notifications = await listMyNotifications();
  return <NotificationList notifications={notifications} />;
}
