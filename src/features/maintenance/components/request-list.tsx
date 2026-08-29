import { WrenchIcon } from "lucide-react";

import { Link } from "@/components/common/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from "@/components/common/status-badge";
import { formatDateTime } from "@/lib/format";
import type { MaintenanceRequestDetail } from "@/types";

/**
 * Danh sách phiếu báo hỏng — một component cho cả hai bên.
 *
 * Cùng một phiếu phải trông giống nhau ở hai khu: chủ trọ và người thuê hay nói
 * chuyện qua điện thoại về "cái phiếu đang sửa", và họ cần đang nhìn cùng một thứ.
 */
export function RequestList({
  requests,
  basePath,
  showRoom = true,
  emptyTitle = "Chưa có phiếu báo hỏng nào",
  emptyDescription,
  emptyAction,
}: {
  requests: MaintenanceRequestDetail[];
  /** "/admin/maintenance" hoặc "/me/maintenance". */
  basePath: string;
  showRoom?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<WrenchIcon />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li key={request.id}>
          <Link href={`${basePath}/${request.id}`} className="block rounded-xl">
            <Card
              className={
                request.status === "closed"
                  ? "opacity-70 transition-colors hover:border-primary/40"
                  : "transition-colors hover:border-primary/40 hover:bg-accent/30"
              }
            >
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 font-medium">{request.title}</p>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <MaintenancePriorityBadge priority={request.priority} />
                    <MaintenanceStatusBadge status={request.status} />
                  </div>
                </div>

                {request.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {request.description}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  {showRoom && <>Phòng {request.room.code} · </>}
                  {request.reporter?.fullName ?? "Người đã xoá"} ·{" "}
                  {formatDateTime(request.createdAt)}
                </p>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
