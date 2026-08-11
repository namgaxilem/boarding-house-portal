"use client";

import { Link } from "@/components/common/link";
import { useMemo } from "react";
import { LayoutGridIcon, SearchIcon, UsersIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoomStatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { useRoomFilterStore } from "@/stores/room-filter-store";
import { ROOM_STATUS_OPTIONS } from "@/lib/constants";
import { formatVND } from "@/lib/format";
import type { RoomStatus, RoomWithOccupancy } from "@/types";

/**
 * Filtering runs in the browser over the rooms already rendered by the server.
 * At ten rooms a server round-trip per keystroke would be slower and pointless.
 */
export function RoomList({ rooms }: { rooms: RoomWithOccupancy[] }) {
  const { status, floor, query, setStatus, setFloor, setQuery, reset } =
    useRoomFilterStore();

  const floors = useMemo(
    () => [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b),
    [rooms],
  );

  const filtered = useMemo(() => {
    const needle = query
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

    return rooms.filter((room) => {
      if (status !== "all" && room.status !== status) return false;
      if (floor !== "all" && room.floor !== floor) return false;
      if (!needle) return true;

      const haystack = [room.code, room.description ?? "", ...room.occupants.map((o) => o.tenant.fullName)]
        .join(" ")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [rooms, status, floor, query]);

  const isFiltered = status !== "all" || floor !== "all" || query.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã phòng hoặc tên người thuê…"
            className="pl-9"
            aria-label="Tìm phòng"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => setStatus(value as RoomStatus | "all")}
        >
          <SelectTrigger className="sm:w-44" aria-label="Lọc theo trạng thái">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            {ROOM_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(floor)}
          onValueChange={(value) => setFloor(value === "all" ? "all" : Number(value))}
        >
          <SelectTrigger className="sm:w-32" aria-label="Lọc theo tầng">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi tầng</SelectItem>
            {floors.map((value) => (
              <SelectItem key={value} value={String(value)}>
                Tầng {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button variant="ghost" onClick={reset} className="sm:w-auto">
            <XIcon />
            Bỏ lọc
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} / {rooms.length} phòng
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<LayoutGridIcon />}
          title="Không có phòng nào khớp"
          description="Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm."
          action={
            <Button variant="outline" onClick={reset}>
              Bỏ lọc
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((room) => (
            <li key={room.id}>
              <Link href={`/admin/rooms/${room.id}`} className="block h-full rounded-xl">
                <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold leading-none">{room.code}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tầng {room.floor} · {room.areaM2}m²
                        </p>
                      </div>
                      <RoomStatusBadge status={room.status} />
                    </div>

                    <p className="font-medium tabular-nums text-primary">
                      {formatVND(room.basePrice)}
                      <span className="text-xs font-normal text-muted-foreground">
                        /tháng
                      </span>
                    </p>

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <UsersIcon className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {room.occupants.length > 0
                          ? room.occupants.map((o) => o.tenant.fullName).join(", ")
                          : "Chưa có người ở"}
                      </span>
                      <span className="ml-auto shrink-0 tabular-nums">
                        {room.occupants.length}/{room.maxOccupants}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
