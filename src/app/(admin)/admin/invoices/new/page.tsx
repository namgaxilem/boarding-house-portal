import { Suspense } from "react";
import type { Metadata } from "next";
import { Link } from "@/components/common/link";
import { AlertCircleIcon, DoorOpenIcon, GaugeIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { PeriodPicker } from "@/components/common/period-picker";
import { EmptyState } from "@/components/common/empty-state";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";
import { RoomPicker } from "@/features/invoices/components/room-picker";
import { buildInvoiceDraft, listOccupiedRooms } from "@/features/invoices/queries";
import { formatMonthYear } from "@/lib/format";
import { currentPeriod, toPeriod } from "@/lib/period";

export const metadata: Metadata = { title: "Lập hoá đơn" };

export const instant = true;

export default async function NewInvoicePage(props: PageProps<"/admin/invoices/new">) {
  const searchParams = await props.searchParams;

  const period =
    toPeriod(typeof searchParams.period === "string" ? searchParams.period : null) ??
    currentPeriod();
  const roomId = typeof searchParams.roomId === "string" ? searchParams.roomId : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lập hoá đơn"
        description={`Tháng ${formatMonthYear(period)}. Số liệu điền sẵn từ chỉ số điện nước và giá thuê trong hợp đồng.`}
        breadcrumbs={[
          { label: "Tổng quan", href: "/admin" },
          { label: "Hoá đơn", href: "/admin/invoices" },
          { label: "Lập hoá đơn" },
        ]}
        actions={<PeriodPicker period={period} />}
      />

      <Suspense key={`${roomId}-${period}`} fallback={<Skeleton className="h-[520px] w-full rounded-xl" />}>
        <Draft roomId={roomId} period={period} />
      </Suspense>
    </div>
  );
}

async function Draft({ roomId, period }: { roomId: string | null; period: string }) {
  const rooms = await listOccupiedRooms();

  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={<DoorOpenIcon />}
        title="Chưa có phòng nào đang ở"
        description="Hoá đơn cần một người thuê đứng tên. Xếp người vào phòng trước."
        action={
          <Button asChild>
            <Link href="/admin/tenancies/new">Nhận phòng</Link>
          </Button>
        }
      />
    );
  }

  const options = rooms.map((room) => ({
    id: room.id,
    code: room.code,
    occupantName:
      room.occupants.find((occupant) => occupant.tenancy.isPrimary)?.tenant.fullName ??
      room.occupants[0]?.tenant.fullName ??
      "—",
  }));

  // Chưa chọn phòng thì lấy phòng đầu danh sách, để trang không mở ra trống trơn.
  const selectedId = roomId && rooms.some((room) => room.id === roomId) ? roomId : rooms[0].id;
  const draft = await buildInvoiceDraft(selectedId, period);

  if (!draft || !draft.tenantId) {
    return (
      <div className="space-y-4">
        <RoomPicker roomId={selectedId} rooms={options} />
        <Alert variant="warning">
          <AlertCircleIcon />
          <AlertDescription>
            Phòng này không có người đứng tên hợp đồng nên chưa lập được hoá đơn.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <RoomPicker roomId={selectedId} rooms={options} />

      {!draft.reading && (
        <Alert variant="warning">
          <GaugeIcon />
          <AlertDescription>
            Chưa ghi chỉ số điện nước tháng {formatMonthYear(period)} cho phòng{" "}
            {draft.room.code}. Số kWh và m³ đang để 0 —{" "}
            <Link
              href={`/admin/meters?period=${period}`}
              className="underline underline-offset-2"
            >
              ghi chỉ số trước
            </Link>{" "}
            rồi quay lại, hoặc tự nhập tay bên dưới.
          </AlertDescription>
        </Alert>
      )}

      <InvoiceForm draft={draft} />
    </div>
  );
}
