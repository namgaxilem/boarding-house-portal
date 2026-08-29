import { Badge } from "@/components/ui/badge";
import {
  MAINTENANCE_PRIORITY_LABEL,
  MAINTENANCE_PRIORITY_STYLE,
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_STATUS_STYLE,
  ROOM_STATUS_DOT,
  ROOM_STATUS_LABEL,
  ROOM_STATUS_STYLE,
  TENANCY_STATUS_LABEL,
  TENANCY_STATUS_STYLE,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  MaintenancePriority,
  MaintenanceStatus,
  RoomStatus,
  TenancyStatus,
} from "@/types";

export function RoomStatusBadge({
  status,
  className,
}: {
  status: RoomStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(ROOM_STATUS_STYLE[status], className)}
      // Colour alone would exclude colour-blind users; the dot plus the label
      // carries the meaning on its own.
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", ROOM_STATUS_DOT[status])}
      />
      {ROOM_STATUS_LABEL[status]}
    </Badge>
  );
}

export function TenancyStatusBadge({
  status,
  className,
}: {
  status: TenancyStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(TENANCY_STATUS_STYLE[status], className)}>
      {TENANCY_STATUS_LABEL[status]}
    </Badge>
  );
}

export function MaintenanceStatusBadge({
  status,
  className,
}: {
  status: MaintenanceStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(MAINTENANCE_STATUS_STYLE[status], className)}>
      {MAINTENANCE_STATUS_LABEL[status]}
    </Badge>
  );
}

/**
 * Mức "bình thường" cố ý KHÔNG hiện badge.
 *
 * Gắn nhãn cho mọi phiếu là làm nhãn mất tác dụng — chủ trọ mở danh sách lên cần
 * thấy ngay cái nào khẩn, chứ không phải đọc chín cái "bình thường" giống nhau.
 */
export function MaintenancePriorityBadge({
  priority,
  className,
  showNormal = false,
}: {
  priority: MaintenancePriority;
  className?: string;
  showNormal?: boolean;
}) {
  if (priority === "normal" && !showNormal) return null;

  return (
    <Badge
      variant="outline"
      className={cn(MAINTENANCE_PRIORITY_STYLE[priority], className)}
    >
      {MAINTENANCE_PRIORITY_LABEL[priority]}
    </Badge>
  );
}
