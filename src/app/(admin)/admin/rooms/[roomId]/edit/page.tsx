import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { RoomForm } from "@/features/rooms/components/room-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Sửa phòng" };

// Mã phòng nằm trong tiêu đề lẫn breadcrumb nên cả trang phụ thuộc dữ liệu; bọc
// <Suspense> để khung trang hiện ngay khi bấm "Sửa" từ trang chi tiết phòng.
export const instant = true;

export default function EditRoomPage(props: PageProps<"/admin/rooms/[roomId]/edit">) {
  return (
    <Suspense fallback={<EditSkeleton />}>
      <EditRoom params={props.params} />
    </Suspense>
  );
}

function EditSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-16 w-full max-w-md rounded-md" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

async function EditRoom({
  params,
}: Pick<PageProps<"/admin/rooms/[roomId]/edit">, "params">) {
  const { roomId } = await params;
  const room = await db.getRoom(roomId);
  if (!room) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sửa phòng ${room.code}`}
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Phòng", href: "/admin/rooms" },
          { label: room.code, href: `/admin/rooms/${room.id}` },
          { label: "Sửa" },
        ]}
      />
      <RoomForm room={room} />
    </div>
  );
}
