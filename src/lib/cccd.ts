/**
 * Đọc mã QR in ở mặt trước thẻ CCCD gắn chip / thẻ Căn cước.
 *
 * Mã QR đó chứa sẵn toàn bộ thông tin cơ bản dưới dạng văn bản thuần, các trường
 * ngăn nhau bằng dấu `|`:
 *
 *   079201001234|123456789|Nguyễn Văn A|01011990|Nam|123 Cầu Giấy, Hà Nội|01012021
 *   └─ số CCCD  └─ CMND cũ └─ họ tên    └─ sinh  └─ GT └─ nơi thường trú  └─ ngày cấp
 *
 * Ngày ở dạng ddMMyyyy, không dấu phân cách.
 *
 * VÌ SAO ĐỌC QR CHỨ KHÔNG OCR ẢNH:
 *   - Chính xác tuyệt đối. OCR đọc nhầm 0/O, 1/I, và rụng dấu tiếng Việt.
 *   - Miễn phí và chạy trong máy. Dịch vụ OCR tính tiền theo lượt VÀ bắt gửi ảnh
 *     giấy tờ tuỳ thân ra máy chủ bên thứ ba — thứ Nghị định 13/2023 coi là
 *     chuyển giao dữ liệu cá nhân nhạy cảm.
 *   - Không cần mạng.
 *
 * File này chỉ xử lý chuỗi, không đụng DOM — dùng được ở cả client lẫn server
 * (Server Action phải kiểm tra lại, không tin dữ liệu client gửi lên).
 */

export interface CccdData {
  /** Số CCCD 12 chữ số (hoặc CMND 9 số với thẻ rất cũ). */
  idNumber: string;
  /** Số CMND 9 số cũ in kèm trên thẻ mới. Rỗng với người chưa từng có CMND. */
  oldIdNumber: string | null;
  fullName: string;
  /** ISO `yyyy-MM-dd`, hợp với kiểu `date` của Postgres và input[type=date]. */
  dateOfBirth: string | null;
  gender: "Nam" | "Nữ" | null;
  /** Nơi thường trú in trên thẻ. */
  residence: string | null;
  issuedOn: string | null;
  /** Chuỗi gốc quét được, giữ lại để soi khi có thẻ lạ không parse nổi. */
  raw: string;
}

export type CccdParseResult =
  | { ok: true; data: CccdData }
  | { ok: false; error: string };

/** `01011990` → `1990-01-01`. Trả về null nếu không phải ngày có thật. */
function parseCompactDate(value: string): string | null {
  const digits = value.trim();
  if (!/^\d{8}$/.test(digits)) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  // Chặn 31/02: Date tự "cuộn" sang tháng sau chứ không báo lỗi, nên phải so lại
  // từng thành phần sau khi dựng.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function cleanDigits(value: string) {
  // Người ta hay đọc CCCD theo nhóm ("034 201 001 234"); một số máy quét cũng
  // chèn khoảng trắng. Bỏ hết cho khớp với ràng buộc ở database.
  return value.replace(/[\s.\-]/g, "");
}

/**
 * Parse nội dung quét được từ mã QR mặt trước CCCD.
 *
 * Cố ý dễ tính với số trường: thẻ đời khác nhau có 6 hoặc 7 phần, và một số máy
 * quét thêm dấu `|` cuối chuỗi. Chỉ số CCCD là bắt buộc.
 */
export function parseCccdQr(text: string): CccdParseResult {
  const raw = text.trim();
  if (!raw) return { ok: false, error: "Không đọc được nội dung mã QR." };

  const parts = raw.split("|").map((part) => part.trim());

  if (parts.length < 4) {
    return {
      ok: false,
      error:
        "Mã QR này không phải mã trên thẻ CCCD. Quét đúng mã vuông ở góc trên bên phải mặt trước thẻ.",
    };
  }

  const idNumber = cleanDigits(parts[0] ?? "");
  if (!/^(\d{9}|\d{12})$/.test(idNumber)) {
    return {
      ok: false,
      error: "Số trên mã QR không giống số CCCD (12 số) hay CMND (9 số).",
    };
  }

  const oldIdNumber = cleanDigits(parts[1] ?? "");
  const fullName = (parts[2] ?? "").replace(/\s+/g, " ").trim();

  if (!fullName) {
    return { ok: false, error: "Mã QR thiếu họ tên. Thử quét lại cho rõ nét." };
  }

  const genderRaw = (parts[4] ?? "").toLowerCase();
  const gender = genderRaw.startsWith("nam")
    ? ("Nam" as const)
    : genderRaw.startsWith("n")
      ? ("Nữ" as const)
      : null;

  return {
    ok: true,
    data: {
      idNumber,
      oldIdNumber: /^\d{9}$/.test(oldIdNumber) ? oldIdNumber : null,
      fullName,
      dateOfBirth: parseCompactDate(parts[3] ?? ""),
      gender,
      residence: (parts[5] ?? "").replace(/\s+/g, " ").trim() || null,
      issuedOn: parseCompactDate(parts[6] ?? ""),
      raw,
    },
  };
}

/** `079201001234` → `079 201 001 234`, dễ đọc lại thành tiếng để đối chiếu. */
export function formatIdNumber(value: string | null) {
  if (!value) return "Chưa có";
  return value.replace(/(\d{3})(?=\d)/g, "$1 ");
}
