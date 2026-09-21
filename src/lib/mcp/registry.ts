import "server-only";

import type { ToolDefinition } from "./tool";
import {
  chiTietBaoHong,
  chiTietPhong,
  danhSachBaoHong,
  danhSachPhong,
  phongTrong,
  suKienGanDay,
  suKienPhong,
} from "./tools/rooms";
import {
  chiTietNguoiThue,
  danhSachNguoiThue,
  hopDongDangHieuLuc,
  hopDongTheoPhong,
} from "./tools/people";
import {
  chiSoDienNuoc,
  chiTietHoaDon,
  danhSachHoaDon,
  hoaDonQuaHan,
  lichSuChiSoPhong,
} from "./tools/money";
import { baoCaoDoanhThu, tongQuanNhaTro } from "./tools/dashboard";

/**
 * Nguồn sự thật duy nhất về việc trợ lý làm được gì.
 *
 * Danh sách ĐÓNG. Không có `bash`, không `web_fetch`, không filesystem, không
 * `execute_sql` — và đó chính là khác biệt cấu trúc so với Supabase MCP mà
 * `README.md` mục 3.8 cảnh báo: server đó đưa cho mô hình một ô SQL tự do, còn
 * registry này không có ô nào để đưa. Mọi tool đi qua `Repository`, nên câu lệnh
 * sinh ra luôn là PostgREST có tham số.
 *
 * -------------------------------------------------------------------------
 *  NHỮNG THỨ CỐ Ý KHÔNG CÓ TOOL
 * -------------------------------------------------------------------------
 *  giấy tờ tuỳ thân  `getLatestIdDocument`, `listIdDocuments`,
 *                    `listPendingIdDocuments`, `signIdDocumentPhotos`
 *                    → số CCCD và ảnh giấy tờ. Một transcript LLM là một BẢN SAO
 *                      MỚI của dữ liệu đó, nằm trong log của nhà cung cấp và
 *                      trong lịch sử chat trên một cái điện thoại có thể mất.
 *                      Ngoài ra `signIdDocumentPhotos` ghi `id_document_access_log`,
 *                      mà dưới service-role thì id người xem vô nghĩa.
 *  cổng              `getGateCredential`, `listGateCredentialsToRevoke`,
 *                    `listGateLocks` → mã mở được cửa trước.
 *  wifi              `listWifi` → trả mật khẩu dạng chữ thường.
 *  vận hành nội bộ   `getStorageUsage`, `listPaymentAccounts` → không câu hỏi nào
 *                    cầm điện thoại hỏi cần tới.
 *
 * Bốn nhóm đó không phải "chưa làm" — thêm chúng vào là một quyết định, và quyết
 * định đó phải được nói ra chứ không lặng lẽ xảy ra vì tiện.
 */
export const ALL_TOOLS: ToolDefinition[] = [
  // phòng
  danhSachPhong,
  chiTietPhong,
  phongTrong,
  suKienPhong,
  suKienGanDay,
  // người & hợp đồng
  danhSachNguoiThue,
  chiTietNguoiThue,
  hopDongTheoPhong,
  hopDongDangHieuLuc,
  // tiền
  danhSachHoaDon,
  hoaDonQuaHan,
  chiTietHoaDon,
  chiSoDienNuoc,
  lichSuChiSoPhong,
  // báo hỏng
  danhSachBaoHong,
  chiTietBaoHong,
  // tổng quan
  tongQuanNhaTro,
  baoCaoDoanhThu,
];

/**
 * Bộ tool CHỈ ĐỌC.
 *
 * Đợt 1 dùng đúng danh sách này, nên binary đang chạy không chứa một lệnh ghi
 * nào — rủi ro ghi bằng 0, không phải "bằng 0 nếu code đúng".
 */
export const READ_TOOLS: ToolDefinition[] = ALL_TOOLS.filter((tool) => tool.readOnly);

/** Đợt 2 sẽ đổ vào đây. Hiện rỗng, và `registry` là chỗ duy nhất biết điều đó. */
export const WRITE_TOOLS: ToolDefinition[] = ALL_TOOLS.filter((tool) => !tool.readOnly);

export function toolByName(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}
