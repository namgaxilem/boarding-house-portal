import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";
import { TENANCY_STATUS_LABEL } from "@/lib/constants";
import { defineTool, text } from "../tool";
import { bullets, capped, date, maskIdNumber, maskPhone, money, untrusted } from "../serialize";

/**
 * Người thuê và hợp đồng.
 *
 * Số CCCD che còn 4 số cuối, số điện thoại che 3 số giữa, và GHI CHÚ RIÊNG của
 * chủ trọ về người thuê (`profile.note`) không bao giờ rời khỏi web. Ba thứ đó
 * là lý do bộ tool này không đơn thuần `JSON.stringify` cái `Repository` trả về.
 *
 * Toàn bộ nhánh giấy tờ tuỳ thân (`id_documents`, ảnh CCCD, `signIdDocumentPhotos`)
 * CỐ Ý KHÔNG có tool nào. Một transcript LLM là một BẢN SAO MỚI của dữ liệu đó,
 * nằm trong log request của nhà cung cấp và trong lịch sử chat trên một cái điện
 * thoại có thể mất. README mục 3.8 viết ra chính mối lo này.
 */

export const danhSachNguoiThue = defineTool({
  name: "danh_sach_nguoi_thue",
  title: "Danh sách người thuê",
  description:
    "Người đang thuê và phòng của họ. Số điện thoại và CCCD được che bớt — " +
    "cần số đầy đủ thì mở trang quản trị.",
  inputSchema: z.object({}),
  readOnly: true,
  async run() {
    const tenants = await db.listTenants();
    const { items, note } = capped(tenants, 40);

    const lines = items.map((tenant) => {
      const room = tenant.currentRoom ? `phòng ${tenant.currentRoom.code}` : "chưa xếp phòng";
      return `${tenant.fullName} — ${room} — ${maskPhone(tenant.phone)}${tenant.isActive ? "" : " (đã khoá)"}`;
    });

    return text(bullets(lines, "Chưa có người thuê nào.") + note);
  },
});

export const chiTietNguoiThue = defineTool({
  name: "chi_tiet_nguoi_thue",
  title: "Chi tiết một người thuê",
  description:
    "Hồ sơ một người thuê và hợp đồng đang hiệu lực. CCCD chỉ hiện 4 số cuối; " +
    "ghi chú riêng của chủ trọ không trả về.",
  inputSchema: z.object({
    maNguoiThue: z.string().uuid().describe("id người thuê, lấy từ danh_sach_nguoi_thue."),
  }),
  readOnly: true,
  async run(input) {
    const tenant = await db.getTenant(input.maNguoiThue);
    if (!tenant) return text("Không tìm thấy người thuê này.");

    const tenancy = tenant.currentTenancy;

    return text(
      [
        `${tenant.fullName}${tenant.isActive ? "" : " — TÀI KHOẢN ĐÃ KHOÁ"}`,
        `Điện thoại: ${maskPhone(tenant.phone)} · CCCD: ${maskIdNumber(tenant.idNumber)}`,
        tenant.hometown ? `Quê quán: ${untrusted("que_quan", tenant.hometown)}` : "",
        tenant.currentRoom
          ? `Phòng ${tenant.currentRoom.code} — ${money(tenancy?.monthlyPrice)}/tháng, cọc ${money(tenancy?.deposit)}`
          : "Chưa được xếp phòng.",
        tenancy ? `Nhận phòng ${date(tenancy.startDate)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  },
});

export const hopDongTheoPhong = defineTool({
  name: "hop_dong_theo_phong",
  title: "Lịch sử thuê của một phòng",
  description: "Ai đã từng ở phòng này, từ bao giờ tới bao giờ.",
  inputSchema: z.object({
    maPhong: z.string().describe("Mã phòng, ví dụ '201'."),
  }),
  readOnly: true,
  async run(input) {
    const room = await db.getRoomByCode(input.maPhong.trim());
    if (!room) return text(`Không tìm thấy phòng "${input.maPhong}".`);

    const tenancies = await db.listTenanciesByRoom(room.id);
    const { items, note } = capped(tenancies, 20);

    const lines = items.map(
      (item) =>
        `${item.tenant.fullName} — ${TENANCY_STATUS_LABEL[item.status]} — ` +
        `${date(item.startDate)} → ${item.endDate ? date(item.endDate) : "nay"} — ${money(item.monthlyPrice)}/tháng`,
    );

    return text(bullets(lines, `Phòng ${room.code} chưa có hợp đồng nào.`) + note);
  },
});

export const hopDongDangHieuLuc = defineTool({
  name: "hop_dong_dang_hieu_luc",
  title: "Hợp đồng đang hiệu lực của một người",
  description: "Hợp đồng thuê hiện tại của một người: phòng nào, giá bao nhiêu, cọc bao nhiêu.",
  inputSchema: z.object({
    maNguoiThue: z.string().uuid(),
  }),
  readOnly: true,
  async run(input) {
    const tenancy = await db.getActiveTenancyForTenant(input.maNguoiThue);
    if (!tenancy) return text("Người này không có hợp đồng nào đang hiệu lực.");

    return text(
      [
        `${tenancy.tenant.fullName} — phòng ${tenancy.room.code}`,
        `Từ ${date(tenancy.startDate)}${tenancy.expectedEndDate ? ` · dự kiến tới ${date(tenancy.expectedEndDate)}` : ""}`,
        `Giá ${money(tenancy.monthlyPrice)}/tháng · cọc ${money(tenancy.deposit)}`,
        tenancy.isPrimary ? "Là người đứng tên hợp đồng." : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  },
});
