import { describe, expect, it } from "vitest";

import { encodeLadder, fitDimensions } from "@/lib/image";
import {
  PAYMENT_QR_POLICY,
  ROOM_PHOTO_POLICY,
  checkUploadFile,
  formatBytes,
  type UploadPolicy,
} from "@/lib/upload-policy";

/**
 * Chỉ test được phần THUẦN. `resizeImage` cần canvas và `createImageBitmap`,
 * mà vitest ở đây chạy `environment: "node"` (xem vitest.config.ts) — nên phần
 * quyết định "bậc nào tiếp theo" được tách hẳn ra để kiểm được ở đây.
 */

describe("fitDimensions", () => {
  it("thu ảnh ngang về vừa khung, giữ tỉ lệ", () => {
    expect(fitDimensions(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("thu ảnh dọc theo cạnh dài, không theo chiều rộng", () => {
    expect(fitDimensions(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("KHÔNG phóng to ảnh vốn đã nhỏ hơn khung", () => {
    expect(fitDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("ảnh vuông giữ nguyên vuông", () => {
    expect(fitDimensions(2000, 2000, 1000)).toEqual({ width: 1000, height: 1000 });
  });

  it("không bao giờ trả về cạnh 0 — ảnh siêu dẹt vẫn phải vẽ được", () => {
    const { width, height } = fitDimensions(10000, 3, 1600);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });
});

describe("encodeLadder", () => {
  it("bậc đầu tiên đúng bằng thông số gốc của policy", () => {
    const [first] = encodeLadder(ROOM_PHOTO_POLICY);
    expect(first).toEqual({
      maxDimension: ROOM_PHOTO_POLICY.maxDimension,
      quality: ROOM_PHOTO_POLICY.quality,
    });
  });

  it("chất lượng không tăng ở bậc sau", () => {
    const ladder = encodeLadder(ROOM_PHOTO_POLICY);
    for (let i = 1; i < ladder.length; i += 1) {
      expect(ladder[i].quality).toBeLessThanOrEqual(ladder[0].quality);
    }
  });

  it("hạ chất lượng TRƯỚC, hạ kích thước SAU", () => {
    const ladder = encodeLadder(ROOM_PHOTO_POLICY);
    // Ba bậc đầu giữ nguyên kích thước, chỉ nhả chất lượng.
    expect(ladder[1].maxDimension).toBe(ROOM_PHOTO_POLICY.maxDimension);
    expect(ladder[2].maxDimension).toBe(ROOM_PHOTO_POLICY.maxDimension);
    expect(ladder[2].quality).toBeLessThan(ladder[1].quality);
    // Từ bậc 4 mới bắt đầu thu nhỏ.
    expect(ladder[3].maxDimension).toBeLessThan(ROOM_PHOTO_POLICY.maxDimension);
  });

  it("kích thước giảm dần từ lúc bắt đầu thu nhỏ", () => {
    const dims = encodeLadder(ROOM_PHOTO_POLICY).map((step) => step.maxDimension);
    for (let i = 1; i < dims.length; i += 1) {
      expect(dims[i]).toBeLessThanOrEqual(dims[i - 1]);
    }
  });

  it("không tụt xuống dưới sàn 0.45 — dưới đó ảnh hiện vệt vuông", () => {
    const low: UploadPolicy = { ...ROOM_PHOTO_POLICY, quality: 0.5 };
    for (const step of encodeLadder(low)) {
      expect(step.quality).toBeGreaterThanOrEqual(0.45);
    }
  });

  it("policy QR giữ chất lượng cao ở mọi bậc — máy quét cần cạnh sắc", () => {
    for (const step of encodeLadder(PAYMENT_QR_POLICY)) {
      expect(step.quality).toBeGreaterThanOrEqual(0.68);
      expect(step.maxDimension).toBeGreaterThanOrEqual(500);
    }
  });
});

describe("checkUploadFile", () => {
  function fakeFile(name: string, type: string, size: number) {
    return { name, type, size } as File;
  }

  it("nhận ảnh đúng kiểu và đủ nhẹ", () => {
    expect(
      checkUploadFile(fakeFile("a.webp", "image/webp", 300 * 1024), ROOM_PHOTO_POLICY),
    ).toBeNull();
  });

  it("từ chối kiểu file lạ", () => {
    const message = checkUploadFile(
      fakeFile("a.gif", "image/gif", 1000),
      ROOM_PHOTO_POLICY,
    );
    expect(message).toContain("không phải ảnh");
  });

  it("từ chối file vượt maxUploadBytes và nói rõ mức trần", () => {
    const message = checkUploadFile(
      fakeFile("a.webp", "image/webp", ROOM_PHOTO_POLICY.maxUploadBytes + 1),
      ROOM_PHOTO_POLICY,
    );
    expect(message).toContain("quá nặng");
    expect(message).toContain(formatBytes(ROOM_PHOTO_POLICY.maxUploadBytes));
  });

  it("dùng nhãn thay cho tên file khi được truyền vào", () => {
    const message = checkUploadFile(
      fakeFile("IMG_0001.HEIC", "image/heic", 1000),
      ROOM_PHOTO_POLICY,
      "mặt trước",
    );
    expect(message).toContain("mặt trước");
  });
});

describe("hạn mức so với gói miễn phí", () => {
  const policies = {
    room: ROOM_PHOTO_POLICY,
    qr: PAYMENT_QR_POLICY,
  };

  it("maxUploadBytes luôn rộng hơn targetBytes — chốt chặn, không phải mức thường", () => {
    for (const policy of Object.values(policies)) {
      expect(policy.maxUploadBytes).toBeGreaterThan(policy.targetBytes);
    }
  });

  it("maxInputBytes luôn rộng hơn maxUploadBytes — ảnh gốc chưa nén thì to hơn", () => {
    for (const policy of Object.values(policies)) {
      expect(policy.maxInputBytes).toBeGreaterThan(policy.maxUploadBytes);
    }
  });
});
