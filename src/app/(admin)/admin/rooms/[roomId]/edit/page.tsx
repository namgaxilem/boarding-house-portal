import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/page-header";
import { RoomForm } from "@/features/rooms/components/room-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Sửa phòng" };

export default async function EditRoomPage(
  props: PageProps<"/admin/rooms/[roomId]/edit">,
) {
  const { roomId } = await props.params;
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
