import Link from "next/link";
import {
  BanknoteIcon,
  LogInIcon,
  LogOutIcon,
  StickyNoteIcon,
  TriangleAlertIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TenancyStatusBadge } from "@/components/common/status-badge";
import { ConfirmForm } from "@/components/common/confirm-form";
import { deleteRoomEvent } from "@/features/rooms/actions";
import { ROOM_EVENT_LABEL } from "@/lib/constants";
import { formatDate, formatDuration, formatVND } from "@/lib/format";
import type { RoomEvent, RoomEventType, TenancyDetail } from "@/types";

const EVENT_ICON: Record<RoomEventType, LucideIcon> = {
  checkin: LogInIcon,
  checkout: LogOutIcon,
  maintenance: WrenchIcon,
  price_change: BanknoteIcon,
  incident: TriangleAlertIcon,
  note: StickyNoteIcon,
};

const EVENT_TONE: Record<RoomEventType, string> = {
  checkin: "bg-success/12 text-success",
  checkout: "bg-secondary text-muted-foreground",
  maintenance: "bg-warning/15 text-warning-foreground dark:text-warning",
  price_change: "bg-info/12 text-info",
  incident: "bg-destructive/10 text-destructive",
  note: "bg-secondary text-muted-foreground",
};

/** Who has rented this room, newest first. This is the room's history. */
export function TenancyHistory({ tenancies }: { tenancies: TenancyDetail[] }) {
  if (tenancies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có ai từng thuê phòng này.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {tenancies.map((tenancy) => (
        <li
          key={tenancy.id}
          className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/tenants/${tenancy.tenantId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {tenancy.tenant.fullName}
              </Link>
              {tenancy.isPrimary && <Badge variant="secondary">Đứng tên</Badge>}
              <TenancyStatusBadge status={tenancy.status} />
            </div>

            <p className="text-sm text-muted-foreground">
              {formatDate(tenancy.startDate)} →{" "}
              {tenancy.endDate ? formatDate(tenancy.endDate) : "nay"} ·{" "}
              {formatDuration(tenancy.startDate, tenancy.endDate)}
              {tenancy.endReason && ` · ${tenancy.endReason}`}
            </p>
          </div>

          <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {formatVND(tenancy.monthlyPrice)}/tháng
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Maintenance, incidents and notes for the room. */
export function EventTimeline({
  events,
  roomId,
}: {
  events: RoomEvent[];
  roomId: string;
}) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có ghi chú nào.</p>;
  }

  return (
    <ol className="relative space-y-5 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
      {events.map((event) => {
        const Icon = EVENT_ICON[event.type];
        return (
          <li key={event.id} className="relative flex gap-3">
            <span
              aria-hidden
              className={`z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card ${EVENT_TONE[event.type]}`}
            >
              <Icon className="size-4" />
            </span>

            <div className="min-w-0 flex-1 space-y-1 pt-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium leading-snug">{event.title}</p>
                <ConfirmForm
                  action={deleteRoomEvent}
                  hidden={{ eventId: event.id, roomId }}
                  title="Xoá ghi chú này?"
                  description={`"${event.title}" sẽ bị xoá khỏi nhật ký phòng. Không khôi phục được.`}
                  triggerLabel="Xoá"
                  triggerProps={{
                    variant: "ghost",
                    size: "sm",
                    className: "text-muted-foreground hover:text-destructive",
                  }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {ROOM_EVENT_LABEL[event.type]} · {formatDate(event.occurredAt)}
                {event.cost !== null && ` · ${formatVND(event.cost)}`}
              </p>

              {event.content && (
                <p className="text-sm text-muted-foreground">{event.content}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
