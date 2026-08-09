"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { RoomPhoto } from "@/types";

/**
 * Xem ảnh phòng: một ảnh lớn + dải ảnh nhỏ bên dưới.
 *
 * Cố tình không làm lightbox toàn màn hình — trên điện thoại, người dùng đã
 * quen chạm-giữ để lưu/phóng to ảnh, thêm một lớp overlay chỉ chắn đường.
 */
export function PhotoGallery({
  photos,
  roomCode,
}: {
  photos: RoomPhoto[];
  roomCode: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) return null;

  const active = photos[Math.min(activeIndex, photos.length - 1)];

  return (
    <div className="space-y-2">
      <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-secondary">
        <Image
          src={active.url}
          alt={active.caption ?? `Ảnh phòng ${roomCode}`}
          fill
          sizes="(max-width: 640px) 100vw, 500px"
          className="object-cover"
          priority
        />
      </div>

      {photos.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {photos.map((photo, index) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === activeIndex}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-lg border-2 transition-colors",
                  index === activeIndex
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={photo.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
