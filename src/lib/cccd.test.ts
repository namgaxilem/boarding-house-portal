import { describe, expect, it } from "vitest";

import { formatIdNumber, parseCccdQr } from "./cccd";

/**
 * Dữ liệu trong file này là CCCD BỊA. Không lấy từ thẻ của ai.
 *
 * Parser này là chỗ duy nhất đọc giấy tờ tuỳ thân của người thuê, và kết quả của
 * nó được chép thẳng sang `profiles.id_number` khi chủ trọ bấm duyệt — sai ở đây
 * là sai hồ sơ tạm trú.
 */
const FULL = "079201001234|123456789|Nguyễn Văn An|01011990|Nam|123 Cầu Giấy, Hà Nội|01012021";

describe("parseCccdQr — thẻ đọc được", () => {
  it("tách đủ bảy trường", () => {
    const result = parseCccdQr(FULL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toMatchObject({
      idNumber: "079201001234",
      oldIdNumber: "123456789",
      fullName: "Nguyễn Văn An",
      dateOfBirth: "1990-01-01",
      gender: "Nam",
      residence: "123 Cầu Giấy, Hà Nội",
      issuedOn: "2021-01-01",
    });
  });

  it("giữ nguyên dấu tiếng Việt", () => {
    const result = parseCccdQr(FULL);
    if (!result.ok) throw new Error("phải parse được");
    // Đây chính là thứ OCR làm hỏng, và là một lý do để đọc QR thay vì OCR.
    expect(result.data.fullName).toBe("Nguyễn Văn An");
  });

  it("nhận giới tính Nữ", () => {
    const result = parseCccdQr(FULL.replace("|Nam|", "|Nữ|"));
    if (!result.ok) throw new Error("phải parse được");
    expect(result.data.gender).toBe("Nữ");
  });

  it("bỏ khoảng trắng và dấu chấm trong số CCCD", () => {
    const result = parseCccdQr(FULL.replace("079201001234", "079 201 001 234"));
    if (!result.ok) throw new Error("phải parse được");
    expect(result.data.idNumber).toBe("079201001234");
  });

  it("chấp nhận thẻ đời cũ thiếu ngày cấp", () => {
    const result = parseCccdQr("079201001234|123456789|Nguyễn Văn An|01011990|Nam|Hà Nội");
    if (!result.ok) throw new Error("phải parse được");
    expect(result.data.issuedOn).toBeNull();
    expect(result.data.residence).toBe("Hà Nội");
  });

  it("chấp nhận dấu | thừa ở cuối chuỗi", () => {
    const result = parseCccdQr(`${FULL}|`);
    expect(result.ok).toBe(true);
  });

  it("người chưa từng có CMND thì oldIdNumber là null, không phải chuỗi rỗng", () => {
    const result = parseCccdQr(FULL.replace("|123456789|", "||"));
    if (!result.ok) throw new Error("phải parse được");
    expect(result.data.oldIdNumber).toBeNull();
  });

  it("giữ lại chuỗi gốc để soi thẻ lạ", () => {
    const result = parseCccdQr(`  ${FULL}  `);
    if (!result.ok) throw new Error("phải parse được");
    expect(result.data.raw).toBe(FULL);
  });
});

describe("parseCccdQr — từ chối, kèm lý do đọc được", () => {
  it("chuỗi rỗng", () => {
    expect(parseCccdQr("   ").ok).toBe(false);
  });

  it("mã QR của thứ khác (link wifi, mã thanh toán)", () => {
    const result = parseCccdQr("https://example.com/wifi");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("không phải mã trên thẻ CCCD");
  });

  it("số không đúng 9 hoặc 12 chữ số", () => {
    expect(parseCccdQr("0792010012|1|Nguyễn Văn An|01011990|Nam|Hà Nội").ok).toBe(false);
    expect(parseCccdQr("abcdefghijkl|1|Nguyễn Văn An|01011990|Nam|Hà Nội").ok).toBe(false);
  });

  it("thiếu họ tên", () => {
    const result = parseCccdQr("079201001234|123456789||01011990|Nam|Hà Nội");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("thiếu họ tên");
  });
});

describe("parseCccdQr — ngày sai vẫn phải gửi được hồ sơ", () => {
  it("ngày không có thật thành null chứ không làm hỏng cả lần quét", () => {
    // 31/02 không tồn tại. `new Date` tự cuộn sang 03/03 nếu không chặn — và khi
    // đó hồ sơ có một ngày sinh sai mà không ai nghi ngờ.
    const result = parseCccdQr(FULL.replace("|01011990|", "|31021990|"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.dateOfBirth).toBeNull();
    expect(result.data.idNumber).toBe("079201001234");
  });

  it("ngày sai định dạng thành null", () => {
    const result = parseCccdQr(FULL.replace("|01011990|", "|1990-01-01|"));
    if (!result.ok) throw new Error("phải parse được");
    expect(result.data.dateOfBirth).toBeNull();
  });

  it("năm ngoài khoảng hợp lý thành null", () => {
    const result = parseCccdQr(FULL.replace("|01011990|", "|01011700|"));
    if (!result.ok) throw new Error("phải parse được");
    expect(result.data.dateOfBirth).toBeNull();
  });

  it("năm nhuận: 29/02/2024 hợp lệ, 29/02/2023 thì không", () => {
    const leap = parseCccdQr(FULL.replace("|01011990|", "|29022024|"));
    if (!leap.ok) throw new Error("phải parse được");
    expect(leap.data.dateOfBirth).toBe("2024-02-29");

    const notLeap = parseCccdQr(FULL.replace("|01011990|", "|29022023|"));
    if (!notLeap.ok) throw new Error("phải parse được");
    expect(notLeap.data.dateOfBirth).toBeNull();
  });
});

describe("formatIdNumber", () => {
  it("nhóm ba chữ số cho dễ đọc lại thành tiếng", () => {
    expect(formatIdNumber("079201001234")).toBe("079 201 001 234");
  });

  it("chưa có số thì nói rõ, không hiện chuỗi rỗng", () => {
    expect(formatIdNumber(null)).toBe("Chưa có");
  });
});
