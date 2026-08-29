"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2Icon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Chọn phòng khi lập hoá đơn.
 *
 * Đổi phòng thì phải quay lại server: tiền phòng, đơn giá và chỉ số điện nước
 * điền sẵn đều là dữ liệu của phòng đó. Tính ở client sẽ cần tải sẵn toàn bộ
 * chỉ số của mọi phòng chỉ để dùng một dòng.
 */
export function RoomPicker({
  roomId,
  rooms,
}: {
  roomId: string | null;
  rooms: { id: string; code: string; occupantName: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("roomId", value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Phòng</span>
      <Select value={roomId ?? undefined} onValueChange={select}>
        <SelectTrigger className="w-[220px]" aria-label="Chọn phòng">
          <SelectValue placeholder="Chọn phòng" />
        </SelectTrigger>
        <SelectContent>
          {rooms.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {room.code} — {room.occupantName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
