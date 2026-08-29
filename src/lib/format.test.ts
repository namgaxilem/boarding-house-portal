import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatMonthYear,
  formatPhone,
  formatVND,
  initials,
  toDateInputValue,
  todayInHouseTz,
} from "./format";

/**
 * Tiến trình test chạy ở TZ=UTC (xem vitest.config.ts).
 *
 * Đó là điểm của cả file này: nếu hiển thị bám theo múi giờ máy chủ thì mọi
 * assertion về giờ Việt Nam dưới đây sẽ lệch đúng 7 tiếng.
 */
describe("hiển thị theo múi giờ nhà trọ, không theo máy chủ", () => {
  it("timestamptz buổi tối giờ VN không tụt về buổi chiều", () => {
    // 2026-08-27T13:30:00Z = 20:30 ngày 27/08 giờ Việt Nam.
    expect(formatDateTime("2026-08-27T13:30:00Z")).toBe("20:30 27/08/2026");
  });

  it("timestamptz sau 17:00 UTC không tụt về hôm trước", () => {
    // 2026-08-27T18:00:00Z = 01:00 ngày 28/08 giờ Việt Nam.
    expect(formatDateTime("2026-08-27T18:00:00Z")).toBe("01:00 28/08/2026");
    expect(formatDate("2026-08-27T18:00:00Z")).toBe("28/08/2026");
  });

  it("nửa đêm giờ VN vẫn là ngày hôm đó", () => {
    // 2026-01-01T00:00:00+07:00 — mốc dễ sai nhất: đổi cả ngày, tháng lẫn năm.
    expect(formatDateTime("2025-12-31T17:00:00Z")).toBe("00:00 01/01/2026");
    expect(formatMonthYear("2025-12-31T17:00:00Z")).toBe("01/2026");
  });
});

describe("cột `date` thuần không bị đổi múi giờ", () => {
  it("hạn đóng giữ nguyên ngày đã lưu", () => {
    // Đây là bẫy ngược lại: "2026-09-05" là NGÀY 05/09, không phải một mốc thời
    // gian. Đem nó đi đổi múi giờ là cách chắc chắn để nó thành 04/09.
    expect(formatDate("2026-09-05")).toBe("05/09/2026");
    expect(toDateInputValue("2026-09-05")).toBe("2026-09-05");
  });

  it("kỳ tính tiền đọc ra đúng tháng", () => {
    expect(formatMonthYear("2026-08-01")).toBe("08/2026");
    expect(formatMonthYear("2026-01-01")).toBe("01/2026");
    expect(formatMonthYear("2026-12-01")).toBe("12/2026");
  });
});

describe("todayInHouseTz", () => {
  it("trả về đúng dạng yyyy-MM-dd", () => {
    expect(todayInHouseTz()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("giá trị rỗng và rác", () => {
  it("null/undefined ra dấu gạch, không ra Invalid Date", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDateTime(null)).toBe("—");
    expect(toDateInputValue(null)).toBe("");
  });

  it("chuỗi rác không làm vỡ trang", () => {
    expect(formatDate("khong-phai-ngay")).toBe("—");
    expect(formatDateTime("2026-13-45T99:99:99Z")).toBe("—");
  });
});

describe("formatVND", () => {
  it("làm tròn về đồng và có ký hiệu tiền", () => {
    expect(formatVND(2500000)).toContain("2.500.000");
    expect(formatVND(0)).toContain("0");
  });

  it("null ra dấu gạch chứ không ra 0 ₫", () => {
    // Khác nhau thật: "chưa có số" và "không mất đồng nào" là hai chuyện.
    expect(formatVND(null)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("dưới một tháng đếm theo ngày", () => {
    expect(formatDuration("2026-08-01", "2026-08-15")).toBe("14 ngày");
  });

  it("tròn năm không kèm phần tháng thừa", () => {
    // Cách cũ chia cho 30,44 ngày/tháng nên một năm tròn ra "11 tháng":
    // 365 / 30,44 = 11,99 và Math.floor cắt mất phần đuôi.
    expect(formatDuration("2025-01-01", "2026-01-01")).toBe("1 năm");
    expect(formatDuration("2024-01-01", "2026-01-01")).toBe("2 năm");
  });

  it("năm lẻ tháng", () => {
    expect(formatDuration("2025-01-01", "2026-03-15")).toBe("1 năm 2 tháng");
  });

  it("đếm tháng theo lịch, không theo số ngày trung bình", () => {
    // Tháng 2 chỉ có 28 ngày — cách chia trung bình đếm nó thành 0,92 tháng.
    expect(formatDuration("2026-01-01", "2026-03-01")).toBe("2 tháng");
    expect(formatDuration("2026-02-01", "2026-03-01")).toBe("1 tháng");
  });

  it("ngày kết thúc trước ngày bắt đầu là dữ liệu hỏng, không phải số âm", () => {
    expect(formatDuration("2026-08-15", "2026-08-01")).toBe("—");
  });
});

describe("formatPhone", () => {
  it("nhóm số 10 chữ số kiểu Việt Nam", () => {
    expect(formatPhone("0912345678")).toBe("0912 345 678");
  });

  it("số không đúng 10 chữ số giữ nguyên, không cắt bừa", () => {
    expect(formatPhone("+84912345678")).toBe("+84912345678");
    expect(formatPhone(null)).toBe("—");
  });
});

describe("initials", () => {
  it("lấy chữ đầu của họ và của tên", () => {
    expect(initials("Nguyễn Văn An")).toBe("NA");
    expect(initials("An")).toBe("AN");
    expect(initials("   ")).toBe("?");
  });
});
