import { describe, expect, it } from "vitest";

import { safeEqual } from "./safe-equal";

describe("safeEqual", () => {
  it("nhận hai chuỗi giống nhau", () => {
    expect(safeEqual("Bearer abc123", "Bearer abc123")).toBe(true);
    expect(safeEqual("", "")).toBe(true);
  });

  it("từ chối hai chuỗi khác nhau cùng độ dài", () => {
    expect(safeEqual("abcdef", "abcdeg")).toBe(false);
    expect(safeEqual("abcdef", "zbcdef")).toBe(false);
  });

  it("KHÔNG ném lỗi khi hai chuỗi khác độ dài", () => {
    // `timingSafeEqual` của node ném lỗi ở ca này; nếu để lọt thì chính việc ném
    // lỗi đã nói cho người gọi biết độ dài bí mật là bao nhiêu.
    expect(() => safeEqual("ngan", "dai-hon-nhieu")).not.toThrow();
    expect(safeEqual("ngan", "dai-hon-nhieu")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });

  it("phân biệt chữ hoa chữ thường và khoảng trắng", () => {
    expect(safeEqual("Secret", "secret")).toBe(false);
    expect(safeEqual("secret ", "secret")).toBe(false);
  });

  it("so theo byte UTF-8, không theo ký tự", () => {
    // "é" dựng sẵn (2 byte) và "é" tách dấu (3 byte) là hai chuỗi khác nhau.
    expect(safeEqual("café", "café")).toBe(false);
  });
});
