import { describe, expect, it } from "vitest";

import {
  currentPeriod,
  defaultDueDate,
  electricUsed,
  lineAmount,
  nextPeriod,
  previousPeriod,
  recentPeriods,
  toMonthInputValue,
  toPeriod,
  waterUsed,
} from "./period";

/**
 * Đây là code TÍNH TIỀN. Sai một chỗ ở đây là người thuê bị thu sai, và không ai
 * phát hiện ra cho tới lúc có người thắc mắc.
 */

describe("toPeriod", () => {
  it('nhận dạng "2026-08" của <input type="month">', () => {
    expect(toPeriod("2026-08")).toBe("2026-08-01");
  });

  it("một ngày bất kỳ trong tháng quy về ngày 01", () => {
    expect(toPeriod("2026-08-17")).toBe("2026-08-01");
    expect(toPeriod("2026-08-31")).toBe("2026-08-01");
  });

  it("chuỗi rác trả về null chứ không đoán bừa", () => {
    expect(toPeriod("")).toBeNull();
    expect(toPeriod(null)).toBeNull();
    expect(toPeriod(undefined)).toBeNull();
    expect(toPeriod("thang tam")).toBeNull();
    expect(toPeriod("2026")).toBeNull();
  });
});

describe("điều hướng kỳ", () => {
  it("qua ranh giới năm", () => {
    expect(previousPeriod("2026-01-01")).toBe("2025-12-01");
    expect(nextPeriod("2025-12-01")).toBe("2026-01-01");
  });

  it("tháng 2 không bị tràn sang tháng 3", () => {
    // Bẫy kinh điển của cộng-trừ tháng: 31/01 + 1 tháng = 03/03 nếu làm cẩu thả.
    expect(nextPeriod("2026-01-01")).toBe("2026-02-01");
    expect(nextPeriod("2026-02-01")).toBe("2026-03-01");
  });

  it("toMonthInputValue cắt về dạng input month", () => {
    expect(toMonthInputValue("2026-08-01")).toBe("2026-08");
  });
});

describe("currentPeriod / recentPeriods", () => {
  it("luôn là ngày 01 của một tháng", () => {
    expect(currentPeriod()).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("đủ số tháng, mới nhất trước, không trùng nhau", () => {
    const list = recentPeriods(12);
    expect(list).toHaveLength(12);
    expect(list[0]).toBe(currentPeriod());
    expect(new Set(list).size).toBe(12);
    // Không cho chọn tháng tương lai.
    expect(list.every((period) => period <= currentPeriod())).toBe(true);
  });

  it("lùi liên tiếp, không nhảy cóc", () => {
    const list = recentPeriods(14);
    for (let i = 1; i < list.length; i += 1) {
      expect(previousPeriod(list[i - 1])).toBe(list[i]);
    }
  });
});

describe("defaultDueDate", () => {
  it("ngày 05 của tháng SAU kỳ tính tiền", () => {
    expect(defaultDueDate("2026-08-01")).toBe("2026-09-05");
  });

  it("qua ranh giới năm", () => {
    expect(defaultDueDate("2026-12-01")).toBe("2027-01-05");
  });
});

describe("lượng tiêu thụ", () => {
  it("lấy hiệu số đồng hồ", () => {
    expect(electricUsed({ electricStart: 1200, electricEnd: 1285 })).toBe(85);
    expect(waterUsed({ waterStart: 40, waterEnd: 46 })).toBe(6);
  });

  it("đồng hồ chạy lùi không sinh ra số âm", () => {
    // Database đã chặn bằng CHECK, nhưng hàm này cũng không được trả số âm:
    // một lượng âm chảy vào hoá đơn là một khoản TRỪ tiền không ai chủ ý.
    expect(electricUsed({ electricStart: 1285, electricEnd: 1200 })).toBe(0);
    expect(waterUsed({ waterStart: 46, waterEnd: 40 })).toBe(0);
  });

  it("chỉ số lẻ vẫn tính đúng", () => {
    expect(electricUsed({ electricStart: 1200.5, electricEnd: 1285.25 })).toBeCloseTo(84.75);
  });
});

describe("lineAmount", () => {
  it("làm tròn về đồng", () => {
    // Cột tiền trong database là numeric(12,0). Không tròn ở đây thì Postgres tự
    // tròn, và tổng hiện trên app lệch vài đồng so với hoá đơn đã lưu.
    expect(lineAmount(84.75, 3800)).toBe(322050);
    expect(lineAmount(0.5, 3)).toBe(2);
  });

  it("số lượng 0 ra 0, không ra NaN", () => {
    expect(lineAmount(0, 3800)).toBe(0);
  });
});
