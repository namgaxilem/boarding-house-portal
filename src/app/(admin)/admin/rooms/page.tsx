import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/components/common/link";
import { AlertCircleIcon, PlusIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { RoomList } from "@/features/rooms/components/room-list";
import { listRooms } from "@/features/rooms/queries";

export const metadata: Metadata = { title: "Phòng" };

// Tiêu đề, breadcrumb và nút "Thêm phòng" nằm trong shell tĩnh nên bấm từ /admin
// sang đây là đổi khung ngay; số phòng, alert và bảng phòng stream sau.
export const instant = true;

export default function AdminRoomsPage(props: PageProps<"/admin/rooms">) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Phòng"
        description={
          <Suspense fallback="Quản lý phòng của nhà trọ.">
            <RoomCount />
          </Suspense>
        }
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

      <Suspense fallback={null}>
        <Notices searchParams={props.searchParams} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Rooms />
      </Suspense>
    </div>
  );
}

async function RoomCount() {
  const rooms = await listRooms();
  return <>Quản lý {rooms.length} phòng của nhà trọ.</>;
}

async function Notices({
  searchParams,
}: Pick<PageProps<"/admin/rooms">, "searchParams">) {
  const { error: rawError, deleted } = await searchParams;
  const error = typeof rawError === "string" ? rawError : null;

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {deleted === "1" && (
        <Alert variant="success" role="status">
          <AlertDescription>Đã xoá phòng.</AlertDescription>
        </Alert>
      )}
    </>
  );
}

async function Rooms() {
  const rooms = await listRooms();
  return <RoomList rooms={rooms} />;
}
