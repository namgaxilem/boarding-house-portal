import { describe, expect, it } from "vitest";

import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("bỏ dấu tiếng Việt", () => {
    expect(slugify("Nhà trọ sạch sẽ, an ninh!")).toBe("nha-tro-sach-se-an-ninh");
    expect(slugify("Hướng dẫn đóng tiền qua Zalo")).toBe("huong-dan-dong-tien-qua-zalo");
  });

  it("xử lý đ và Đ — NFD không tách được hai chữ này", () => {
    expect(slugify("Điện nước tháng 10")).toBe("dien-nuoc-thang-10");
    expect(slugify("Đèn hành lang đã sửa")).toBe("den-hanh-lang-da-sua");
    expect(slugify("đường Phạm Văn Đồng")).toBe("duong-pham-van-dong");
  });

  it("chữ dựng sẵn và chữ tách dấu cho cùng một slug", () => {
    const precomposed = "Tin tết"; // ế = U+1EBF
    const decomposed = "Tin tét"; // e + U+0301
    expect(slugify(precomposed)).toBe(slugify(decomposed));
    expect(slugify(precomposed)).toBe("tin-tet");
  });

  it("gộp và cắt dấu nối thừa", () => {
    expect(slugify("---A---B---")).toBe("a-b");
    expect(slugify("  Thông  báo   ")).toBe("thong-bao");
    expect(slugify("Giá điện: 3.500đ/kWh")).toBe("gia-dien-3-500d-kwh");
  });

  it("giữ nguyên số", () => {
    expect(slugify("2026")).toBe("2026");
  });

  it("rơi về 'bai-viet' khi không còn ký tự nào dùng được", () => {
    expect(slugify("🏠🏠")).toBe("bai-viet");
    expect(slugify("")).toBe("bai-viet");
    expect(slugify("!!!")).toBe("bai-viet");
    // Còn đúng một ký tự thì vẫn dưới mức tối thiểu của ràng buộc DB.
    expect(slugify("a...")).toBe("bai-viet");
  });

  it("cắt ở 60 ký tự và cắt tại dấu nối, không cắt giữa từ", () => {
    const long = slugify(
      "Thông báo về việc tạm ngưng cung cấp nước sinh hoạt toàn bộ khu nhà trọ",
    );
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("-")).toBe(false);
    // Không có từ nào bị cắt dở: mọi đoạn đều là một từ trọn vẹn của nguồn.
    const words = new Set(
      slugify("Thông báo về việc tạm ngưng cung cấp nước sinh hoạt toàn bộ khu nhà trọ")
        .split("-"),
    );
    for (const w of long.split("-")) expect(words.has(w)).toBe(true);
  });

  it("một từ dài hơn 60 ký tự vẫn bị cắt cứng", () => {
    const out = slugify("a".repeat(100));
    expect(out).toBe("a".repeat(60));
  });

  it("chạy hai lần cho cùng kết quả", () => {
    const inputs = [
      "Điện nước tháng 10",
      "---A---B---",
      "Nhà trọ sạch sẽ, an ninh!",
      "2026",
      "🏠🏠",
    ];
    for (const input of inputs) {
      expect(slugify(slugify(input))).toBe(slugify(input));
    }
  });
});

describe("uniqueSlug", () => {
  it("trả nguyên slug khi chưa ai dùng", () => {
    expect(uniqueSlug("thong-bao", [])).toBe("thong-bao");
    expect(uniqueSlug("thong-bao", ["khac"])).toBe("thong-bao");
  });

  it("đánh số từ 2 và bỏ qua số đã dùng", () => {
    expect(uniqueSlug("x", ["x"])).toBe("x-2");
    expect(uniqueSlug("x", ["x", "x-2"])).toBe("x-3");
    expect(uniqueSlug("x", ["x", "x-2", "x-4"])).toBe("x-3");
  });

  it("rơi sang hậu tố ngẫu nhiên khi đã kẹt tới 99", () => {
    const taken = ["x", ...Array.from({ length: 98 }, (_, i) => `x-${i + 2}`)];
    const out = uniqueSlug("x", taken);
    expect(taken).not.toContain(out);
    expect(out).toMatch(/^x-[a-z0-9]{1,6}$/);
  });
});
