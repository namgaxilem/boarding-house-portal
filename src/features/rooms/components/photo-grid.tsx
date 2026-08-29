import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmForm } from "@/components/common/confirm-form";
import {
  deleteRoomPhoto,
  moveRoomPhoto,
  setCoverPhoto,
} from "@/features/rooms/photo-actions";
import type { RoomPhoto } from "@/types";

/**
 * Lưới ảnh ở trang quản trị.
 *
 * Ảnh đầu tiên là ảnh bìa — không có cột `is_cover` riêng, nên "đặt làm bìa"
 * chỉ là đẩy ảnh đó lên vị trí 0.
 */
export function PhotoGrid({
  photos,
  roomCode,
  roomId,
}: {
  photos: RoomPhoto[];
  roomCode: string;
  roomId: string;
}) {
  if (photos.length === 0) {
    return (
      <EmptyState
        title="Chưa có ảnh nào"
        description="Ảnh đầu tiên sẽ được dùng làm ảnh bìa ở trang giới thiệu."
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo, index) => (
        <li
          key={photo.id}
          className="group overflow-hidden rounded-lg border border-border bg-secondary/30"
        >
          <div className="relative aspect-4/3">
            <Image
              src={photo.url}
              alt={
                photo.caption ??
                `Ảnh ${index + 1} của phòng ${roomCode}`
              }
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
            />
            {index === 0 && (
              <Badge className="absolute left-2 top-2 shadow-sm">
                <StarIcon />
                Ảnh bìa
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 p-1.5">
            <form action={moveRoomPhoto}>
              <input type="hidden" name="photoId" value={photo.id} />
              <input type="hidden" name="roomId" value={roomId} />
              <input type="hidden" name="direction" value="up" />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                disabled={index === 0}
                aria-label="Chuyển lên trước"
                title="Chuyển lên trước"
              >
                <ChevronLeftIcon />
              </Button>
            </form>

            <form action={moveRoomPhoto}>
              <input type="hidden" name="photoId" value={photo.id} />
              <input type="hidden" name="roomId" value={roomId} />
              <input type="hidden" name="direction" value="down" />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                disabled={index === photos.length - 1}
                aria-label="Chuyển xuống sau"
                title="Chuyển xuống sau"
              >
                <ChevronRightIcon />
              </Button>
            </form>

            {index !== 0 && (
              <form action={setCoverPhoto}>
                <input type="hidden" name="photoId" value={photo.id} />
                <input type="hidden" name="roomId" value={roomId} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Đặt làm ảnh bìa"
                  title="Đặt làm ảnh bìa"
                >
                  <StarIcon />
                </Button>
              </form>
            )}

            <div className="flex-1" />

            <ConfirmForm
              action={deleteRoomPhoto}
              hidden={{ photoId: photo.id, roomId }}
              title="Xoá ảnh này?"
              description="Ảnh sẽ bị xoá khỏi kho lưu trữ, không khôi phục được."
              triggerLabel={<Trash2Icon />}
              triggerProps={{
                variant: "ghost",
                size: "icon-sm",
                className: "text-muted-foreground hover:text-destructive",
                "aria-label": "Xoá ảnh",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
