import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";
import {
  MAINTENANCE_PRIORITY_LABEL,
  MAINTENANCE_STATUS_LABEL,
  ROOM_EVENT_LABEL,
  ROOM_STATUS_LABEL,
} from "@/lib/constants";
import { defineTool, text } from "../tool";
import { bullets, capped, date, money, untrusted } from "../serialize";

export const danhSachPhong = defineTool({
  name: "danh_sach_phong",
  title: "Danh sách phòng",
  description:
    "Liệt kê mọi phòng trong nhà trọ kèm trạng thái, giá thuê và số người đang ở. " +
    "Dùng khi được hỏi tổng quan về phòng. KHÔNG trả về mã cổng hay mật khẩu wifi.",
  inputSchema: z.object({
    trangThai: z
      .enum(["vacant", "occupied", "maintenance", "reserved"])
      .optional()
      .describe("Lọc theo trạng thái. Bỏ trống thì lấy tất cả."),
  }),
  readOnly: true,
  async run(input) {
    const rooms = await db.listRooms(input.trangThai ? { status: input.trangThai } : undefined);
    const { items, note } = capped(rooms, 40);

    const lines = items.map((room) => {
      const who = room.occupants.map((o) => o.tenant.fullName).join(", ");
      return (
        `Phòng ${room.code} — ${ROOM_STATUS_LABEL[room.status]} — ${money(room.basePrice)}/tháng` +
        ` — tầng ${room.floor}, ${room.areaM2}m², tối đa ${room.maxOccupants} người` +
        (who ? ` — đang ở: ${who}` : "")
      );
    });

    return text(bullets(lines, "Không có phòng nào khớp.") + note);
  },
});

export const chiTietPhong = defineTool({
  name: "chi_tiet_phong",
  title: "Chi tiết một phòng",
  description:
    "Thông tin đầy đủ của một phòng: giá điện/nước/dịch vụ, mô tả, và ai đang ở. " +
    "Nhận mã phòng (ví dụ '201') hoặc id.",
  inputSchema: z.object({
    maPhong: z.string().describe("Mã phòng như người ta hay gọi, ví dụ '201'."),
  }),
  readOnly: true,
  async run(input) {
    const byCode = await db.getRoomByCode(input.maPhong.trim());
    const room = byCode ? await db.getRoom(byCode.id) : null;
    if (!room) return text(`Không tìm thấy phòng "${input.maPhong}".`);

    const occupants = room.occupants.map(
      (o) =>
        `${o.tenant.fullName}${o.tenancy.isPrimary ? " (người đứng tên)" : ""}` +
        ` — từ ${date(o.tenancy.startDate)}, ${money(o.tenancy.monthlyPrice)}/tháng`,
    );

    return text(
      [
        `Phòng ${room.code} — ${ROOM_STATUS_LABEL[room.status]}`,
        `Tầng ${room.floor} · ${room.areaM2}m² · tối đa ${room.maxOccupants} người`,
        `Giá thuê ${money(room.basePrice)}/tháng`,
        `Điện ${money(room.electricPrice)}/kWh · Nước ${money(room.waterPrice)}/m³ · Dịch vụ ${money(room.servicePrice)}/tháng`,
        room.description ? `Mô tả: ${untrusted("mo_ta_phong", room.description)}` : "",
        "",
        "Đang ở:",
        bullets(occupants, "Phòng đang trống."),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  },
});

export const phongTrong = defineTool({
  name: "phong_trong",
  title: "Phòng còn trống",
  description:
    "Danh sách phòng đang trống kèm giá — đúng thứ trả lời khi có người hỏi thuê phòng.",
  inputSchema: z.object({}),
  readOnly: true,
  async run() {
    const rooms = await db.listVacantRooms();
    const lines = rooms.map(
      (room) =>
        `Phòng ${room.code} — ${money(room.basePrice)}/tháng — tầng ${room.floor}, ${room.areaM2}m², tối đa ${room.maxOccupants} người`,
    );
    return text(bullets(lines, "Hiện không còn phòng trống."));
  },
});

export const suKienPhong = defineTool({
  name: "su_kien_phong",
  title: "Nhật ký một phòng",
  description:
    "Sổ tay của chủ trọ về một phòng: nhận/trả phòng, sửa chữa, đổi giá, sự cố, ghi chú.",
  inputSchema: z.object({
    maPhong: z.string().describe("Mã phòng, ví dụ '201'."),
  }),
  readOnly: true,
  async run(input) {
    const room = await db.getRoomByCode(input.maPhong.trim());
    if (!room) return text(`Không tìm thấy phòng "${input.maPhong}".`);

    const events = await db.listRoomEvents(room.id);
    const { items, note } = capped(events, 20);

    const lines = items.map(
      (event) =>
        `${date(event.occurredAt)} — ${ROOM_EVENT_LABEL[event.type]}: ${untrusted("tieu_de_su_kien", event.title)}` +
        (event.cost ? ` — ${money(event.cost)}` : ""),
    );

    return text(bullets(lines, `Phòng ${room.code} chưa có ghi chép nào.`) + note);
  },
});

export const suKienGanDay = defineTool({
  name: "su_kien_gan_day",
  title: "Việc mới xảy ra",
  description: "Những ghi chép mới nhất trên toàn nhà trọ, mới nhất lên đầu.",
  inputSchema: z.object({
    soLuong: z.number().int().min(1).max(30).default(10),
  }),
  readOnly: true,
  async run(input) {
    const events = await db.listRecentEvents(input.soLuong);
    const lines = events.map(
      (event) =>
        `${date(event.occurredAt)} — Phòng ${event.room.code} — ${ROOM_EVENT_LABEL[event.type]}: ${untrusted("tieu_de_su_kien", event.title)}`,
    );
    return text(bullets(lines, "Chưa có ghi chép nào."));
  },
});

export const danhSachBaoHong = defineTool({
  name: "danh_sach_bao_hong",
  title: "Phiếu báo hỏng",
  description:
    "Phiếu báo hỏng người thuê gửi. Mặc định chỉ lấy phiếu CHƯA xong (đang chờ hoặc đang sửa).",
  inputSchema: z.object({
    trangThai: z
      .enum(["active", "open", "in_progress", "resolved", "closed", "all"])
      .default("active")
      .describe("'active' = chưa xong. 'all' = tất cả."),
  }),
  readOnly: true,
  async run(input) {
    const requests = await db.listMaintenanceRequests({ status: input.trangThai });
    const { items, note } = capped(requests, 25);

    const lines = items.map(
      (request) =>
        `Phòng ${request.room.code} — ${MAINTENANCE_STATUS_LABEL[request.status]}` +
        (request.priority === "urgent" ? " — KHẨN CẤP" : "") +
        `: ${untrusted("tieu_de_bao_hong", request.title)} (gửi ${date(request.createdAt)})`,
    );

    return text(bullets(lines, "Không có phiếu nào khớp.") + note);
  },
});

export const chiTietBaoHong = defineTool({
  name: "chi_tiet_bao_hong",
  title: "Chi tiết một phiếu báo hỏng",
  description: "Nội dung đầy đủ của một phiếu báo hỏng, kèm mô tả người thuê viết.",
  inputSchema: z.object({
    maPhieu: z.string().uuid().describe("id của phiếu, lấy từ danh_sach_bao_hong."),
  }),
  readOnly: true,
  async run(input) {
    const request = await db.getMaintenanceRequest(input.maPhieu);
    if (!request) return text("Không tìm thấy phiếu báo hỏng này.");

    return text(
      [
        `Phòng ${request.room.code} — ${MAINTENANCE_STATUS_LABEL[request.status]} — ${MAINTENANCE_PRIORITY_LABEL[request.priority]}`,
        `Tiêu đề: ${untrusted("tieu_de_bao_hong", request.title)}`,
        request.description
          ? `Mô tả: ${untrusted("mo_ta_bao_hong", request.description)}`
          : "",
        `Người gửi: ${request.reporter?.fullName ?? "không rõ"} · ${date(request.createdAt)}`,
        request.resolutionNote
          ? `Ghi chú xử lý: ${untrusted("ghi_chu_xu_ly", request.resolutionNote)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  },
});
