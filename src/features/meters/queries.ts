import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import { previousPeriod } from "@/lib/period";
import type { MeterReading, RoomMeterRow } from "@/types";

/**
 * Một hàng cho mỗi phòng trong tháng đang xem: phòng, người ở, chỉ số đã ghi (nếu
 * có) và chỉ số kỳ trước để điền sẵn số đầu kỳ.
 *
 * Ba truy vấn cho cả nhà trọ, không phải ba truy vấn mỗi phòng: phòng + chỉ số
 * tháng này + chỉ số tháng trước, rồi ghép trong bộ nhớ. Chỉ những phòng thiếu
 * chỉ số ở tháng liền trước mới phải hỏi thêm một lần (chủ trọ bỏ ghi một tháng),
 * và đó là ngoại lệ, không phải mặc định.
 */
export const listMeterRows = cache(async (period: string): Promise<RoomMeterRow[]> => {
  const [rooms, current, lastMonth] = await Promise.all([
    db.listRooms(),
    db.listMeterReadings(period),
    db.listMeterReadings(previousPeriod(period)),
  ]);

  const currentByRoom = new Map(current.map((reading) => [reading.roomId, reading]));
  const previousByRoom = new Map<string, MeterReading>(
    lastMonth.map((reading) => [reading.roomId, reading]),
  );

  const missingPrevious = rooms.filter((room) => !previousByRoom.has(room.id));
  const fallbacks = await Promise.all(
    missingPrevious.map((room) => db.getPreviousMeterReading(room.id, period)),
  );
  for (const reading of fallbacks) {
    if (reading) previousByRoom.set(reading.roomId, reading);
  }

  return rooms.map<RoomMeterRow>((room) => ({
    room,
    occupantNames: room.occupants.map((occupant) => occupant.tenant.fullName),
    reading: currentByRoom.get(room.id) ?? null,
    previous: previousByRoom.get(room.id) ?? null,
  }));
});

/** Lịch sử chỉ số của phòng người thuê đang ở — hiện ở /me/room. */
export const listReadingsForRoom = cache(async (roomId: string, limit = 6) =>
  db.listMeterReadingsForRoom(roomId, limit),
);
