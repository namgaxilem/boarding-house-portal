import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/dal";
import { db, type InvoiceFilter } from "@/lib/db";
import { defaultDueDate, electricUsed, waterUsed } from "@/lib/period";
import type { MeterReading, Room, RoomWithOccupancy } from "@/types";

export const listInvoices = cache(async (filter: InvoiceFilter = {}) =>
  db.listInvoices(filter),
);

/** Hoá đơn của chính người đang đăng nhập. RLS ẩn hoá đơn nháp. */
export const listMyInvoices = cache(async () => {
  const user = await requireUser();
  return db.listInvoicesForTenant(user.id);
});

export const getMyUnpaidInvoices = cache(async () => {
  const invoices = await listMyInvoices();
  return invoices.filter((invoice) => invoice.status === "issued");
});

/**
 * Số liệu điền sẵn cho form lập hoá đơn.
 *
 * Lấy từ ba nguồn, theo đúng thứ tự ưu tiên đó:
 *   - tiền phòng: `tenancy.monthlyPrice` (giá lúc ký), KHÔNG phải `room.basePrice`
 *     hiện tại — tăng giá phòng không được tự động áp vào người đang thuê;
 *   - số kWh / m³: chỉ số của kỳ đó;
 *   - đơn giá điện nước, phí dịch vụ: từ phòng, vì chúng đúng tại thời điểm lập.
 */
export interface InvoiceDraft {
  room: Room;
  period: string;
  tenantId: string | null;
  tenantName: string | null;
  tenancyId: string | null;
  reading: MeterReading | null;
  electricKwh: number;
  waterM3: number;
  rent: number;
  electricPrice: number;
  waterPrice: number;
  serviceAmount: number;
  dueDate: string;
}

export async function buildInvoiceDraft(
  roomId: string,
  period: string,
): Promise<InvoiceDraft | null> {
  const [room, reading] = await Promise.all([
    db.getRoom(roomId),
    db.getMeterReading(roomId, period),
  ]);
  if (!room) return null;

  // Người đứng tên hợp đồng trả tiền. `listRooms`/`getRoom` đã xếp người đứng tên
  // lên đầu, nên phần tử đầu là đúng người.
  const primary = pickPrimaryOccupant(room);

  return {
    room,
    period,
    tenantId: primary?.tenant.id ?? null,
    tenantName: primary?.tenant.fullName ?? null,
    tenancyId: primary?.tenancy.id ?? null,
    reading,
    electricKwh: reading ? electricUsed(reading) : 0,
    waterM3: reading ? waterUsed(reading) : 0,
    rent: primary?.tenancy.monthlyPrice ?? room.basePrice,
    electricPrice: room.electricPrice,
    waterPrice: room.waterPrice,
    serviceAmount: room.servicePrice,
    dueDate: defaultDueDate(period),
  };
}

function pickPrimaryOccupant(room: RoomWithOccupancy) {
  return room.occupants.find((occupant) => occupant.tenancy.isPrimary) ?? room.occupants[0];
}

/** Phòng đang có người ở — chỉ những phòng này lập được hoá đơn. */
export const listOccupiedRooms = cache(async () => {
  const rooms = await db.listRooms();
  return rooms.filter((room) => room.occupants.length > 0);
});
