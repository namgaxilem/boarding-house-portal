import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircleIcon, PlusIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { RoomList } from "@/features/rooms/components/room-list";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Phòng" };

export default async function AdminRoomsPage(props: PageProps<"/admin/rooms">) {
  const searchParams = await props.searchParams;
  const rooms = await db.listRooms();

  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const deleted = searchParams.deleted === "1";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phòng"
        description={`Quản lý ${rooms.length} phòng của nhà trọ.`}
        breadcrumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Phòng" }]}
        actions={
          <Button asChild>
            <Link href="/admin/rooms/new">
              <PlusIcon />
              Thêm phòng
            </Link>
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {deleted && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã xoá phòng.</AlertDescription>
        </Alert>
      )}

      <RoomList rooms={rooms} />
    </div>
  );
}
