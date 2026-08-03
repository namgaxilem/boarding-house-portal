import { Badge } from "@/components/ui/badge";
import {
  ROOM_STATUS_DOT,
  ROOM_STATUS_LABEL,
  ROOM_STATUS_STYLE,
  TENANCY_STATUS_LABEL,
  TENANCY_STATUS_STYLE,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { RoomStatus, TenancyStatus } from "@/types";

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
