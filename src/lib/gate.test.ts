import { describe, expect, it } from "vitest";

import {
  buildPasscodeName,
  endOfHouseDay,
  generatePasscode,
  isOurPasscodeName,
  needsExtension,
  parsePasscodeName,
  passcodeWindow,
  planGateSync,
  recordCursor,
  type LocalPasscodeSnapshot,
  type RemotePasscodeSnapshot,
} from "./gate";

/**
 * Test chạy dưới TZ=UTC (xem vitest.config.ts). Đó là cố ý: máy ở Việt Nam vốn
 * đã UTC+7 nên bug lệch bảy tiếng không bao giờ lộ ra khi dev.
 */

const DAY = 86_400_000;
const ID = "3f9a2c1b-1111-2222-3333-444455556666";

/* -------------------------------------------------------------------------- */

describe("tên mã trên khoá", () => {
  it("dựng rồi tách lại ra đúng thứ đã bỏ vào", () => {
    const name = buildPasscodeName("P101", ID);
    expect(name).toBe("NT-P101-3f9a2c1b");
    expect(parsePasscodeName(name)).toEqual({
      prefix: "NT",
      roomCode: "P101",
      idPrefix: "3f9a2c1b",
    });
  });

  it("bỏ ký tự lạ trong mã phòng để không làm hỏng việc tách chuỗi", () => {
    expect(buildPasscodeName("P-1/01", ID)).toBe("NT-P101-3f9a2c1b");
    expect(parsePasscodeName(buildPasscodeName("P-1/01", ID))).not.toBeNull();
  });

  it("mã phòng rỗng vẫn ra tên tách lại được", () => {
    expect(buildPasscodeName("", ID)).toBe("NT-NA-3f9a2c1b");
    expect(isOurPasscodeName(buildPasscodeName("", ID))).toBe(true);
  });

  /**
   * Đây là test quan trọng nhất của cả module.
   *
   * Nó là thứ duy nhất đứng giữa app và việc xoá mất mã mà chủ trọ tự bấm trong
   * app TTLock cho mẹ mình.
   */
  it("KHÔNG nhận mã do người khác đặt tên", () => {
    for (const name of [
      "Mã của mẹ",
      "khach",
      "",
      null,
      undefined,
      "NT-P101", // thiếu phần id
      "NT-P101-3f9a2c1b-x", // thừa phần
      "XX-P101-3f9a2c1b", // sai tiền tố
      "NT-P101-ZZZZZZZZ", // id không phải hex
      "NT-P101-3f9a2c1", // id 7 ký tự
      "nt-P101-3f9a2c1b", // tiền tố sai hoa thường
    ]) {
      expect(isOurPasscodeName(name)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("sinh mã", () => {
  /** Nguồn chữ số giả, lặp lại một dãy cố định. */
  function scripted(...runs: string[]) {
    const digits = runs.join("").split("").map(Number);
    let i = 0;
    return () => digits[i++ % digits.length];
  }

  it("đúng độ dài và toàn chữ số", () => {
    const code = generatePasscode(6);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("bỏ qua mã yếu rồi lấy mã kế tiếp", () => {
    // 111111 (toàn một chữ số) và 123456 (dãy tăng) đều phải bị loại.
    const code = generatePasscode(6, [], scripted("111111", "123456", "480293"));
    expect(code).toBe("480293");
  });

  it("bỏ qua dãy giảm liên tiếp", () => {
    expect(generatePasscode(6, [], scripted("987654", "480293"))).toBe("480293");
  });

  it("không trùng mã đang sống trên cùng ổ khoá", () => {
    const code = generatePasscode(6, ["480293"], scripted("480293", "751046"));
    expect(code).toBe("751046");
  });

  it("chịu thua có kiểm soát thay vì quay vô hạn", () => {
    // Nguồn chỉ sinh đúng một mã, mà mã đó lại đã bị chiếm.
    expect(() => generatePasscode(6, ["480293"], scripted("480293"))).toThrow(
      "GATE_PASSCODE_EXHAUSTED",
    );
  });
});

/* -------------------------------------------------------------------------- */

describe("hạn hiệu lực", () => {
  const now = new Date("2026-09-04T10:00:00Z");

  it("không có hạn hợp đồng thì dùng nguyên cửa sổ trượt", () => {
    const w = passcodeWindow(now, null, { windowDays: 60, graceDays: 14 });
    expect(w.endAt.getTime()).toBe(now.getTime() + 60 * DAY);
    expect(w.cappedByContract).toBe(false);
  });

  it("hạn hợp đồng gần thì cắt ngắn cửa sổ", () => {
    const w = passcodeWindow(now, "2026-09-20", { windowDays: 60, graceDays: 14 });
    expect(w.cappedByContract).toBe(true);
    // 20/09 + 14 ngày đệm = 04/10, gần hơn mốc 60 ngày (03/11).
    expect(w.endAt.getTime()).toBeLessThan(now.getTime() + 60 * DAY);
    expect(w.endAt.getTime()).toBeGreaterThan(now.getTime() + 29 * DAY);
  });

  it("hạn hợp đồng xa thì cửa sổ trượt vẫn là thứ chặn", () => {
    const w = passcodeWindow(now, "2027-09-04", { windowDays: 60, graceDays: 14 });
    expect(w.endAt.getTime()).toBe(now.getTime() + 60 * DAY);
    expect(w.cappedByContract).toBe(false);
  });

  it("hợp đồng đã hết hạn từ trước vẫn ra một mã sống được, không ném lỗi", () => {
    const w = passcodeWindow(now, "2020-01-01", { windowDays: 60, graceDays: 14 });
    expect(w.endAt.getTime()).toBe(now.getTime() + DAY);
    expect(w.endAt.getTime()).toBeGreaterThan(w.startAt.getTime());
  });

  /**
   * Module này nói chuyện bằng epoch ms, nên KHÔNG được có phép tính múi giờ nào
   * lọt vào độ dài cửa sổ. Cấp mã lúc 23:59 hay 00:01 giờ Việt Nam đều phải ra
   * đúng chừng ấy ngày.
   */
  it("độ dài cửa sổ không phụ thuộc giờ trong ngày", () => {
    const late = passcodeWindow(new Date("2026-09-04T16:59:00Z"), null, { windowDays: 60 });
    const early = passcodeWindow(new Date("2026-09-04T17:01:00Z"), null, { windowDays: 60 });
    expect(late.endAt.getTime() - late.startAt.getTime()).toBe(
      early.endAt.getTime() - early.startAt.getTime(),
    );
  });

  it("cuối ngày theo giờ nhà trọ là 16:59:59Z, không phải 23:59:59Z", () => {
    // Việt Nam UTC+7: 23:59:59 ngày 20/09 giờ VN = 16:59:59 ngày 20/09 UTC.
    expect(endOfHouseDay("2026-09-20").toISOString()).toBe("2026-09-20T16:59:59.000Z");
  });

  it("needsExtension bật đúng ở mốc", () => {
    expect(needsExtension(new Date(now.getTime() + 29 * DAY), now, 30)).toBe(true);
    expect(needsExtension(new Date(now.getTime() + 31 * DAY), now, 30)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe("con trỏ kéo nhật ký", () => {
  const now = new Date("2026-09-04T10:00:00Z");

  it("lần đầu kẹp lại, không kéo cả năm về", () => {
    const c = recordCursor(null, now, { firstRunDays: 7 });
    expect(c.startAt.getTime()).toBe(now.getTime() - 7 * DAY);
    expect(c.endAt).toEqual(now);
  });

  it("lần sau kéo lùi thêm phần chồng lấn", () => {
    const latest = new Date(now.getTime() - 2 * DAY).toISOString();
    const c = recordCursor(latest, now, { overlapHours: 6 });
    expect(c.startAt.getTime()).toBe(Date.parse(latest) - 6 * 3_600_000);
  });

  it("đồng hồ ổ khoá chạy nhanh không sinh khoảng ngược", () => {
    const future = new Date(now.getTime() + 5 * DAY).toISOString();
    const c = recordCursor(future, now, { overlapHours: 6 });
    expect(c.startAt.getTime()).toBeLessThan(c.endAt.getTime());
  });
});

/* -------------------------------------------------------------------------- */

describe("planGateSync", () => {
  const now = new Date("2026-09-04T10:00:00Z");

  function local(over: Partial<LocalPasscodeSnapshot> = {}): LocalPasscodeSnapshot {
    return {
      id: ID,
      remoteName: "NT-P101-3f9a2c1b",
      ttlockPasscodeId: null,
      status: "pending",
      endAt: new Date(now.getTime() + 60 * DAY).toISOString(),
      tenancyActive: true,
      expectedEndDate: null,
      attemptCount: 0,
      ...over,
    };
  }
  const onLock: RemotePasscodeSnapshot = {
    keyboardPwdId: 777,
    keyboardPwdName: "NT-P101-3f9a2c1b",
  };

  it("pending + đã có trên khoá -> adopt (gỡ mù sau timeout)", () => {
    const { intents } = planGateSync({ local: [local()], remote: [onLock], now });
    expect(intents).toEqual([{ type: "adopt", passcodeId: ID, ttlockPasscodeId: 777 }]);
  });

  it("pending + chưa có trên khoá -> add", () => {
    const { intents } = planGateSync({ local: [local()], remote: [], now });
    expect(intents).toEqual([{ type: "add", passcodeId: ID }]);
  });

  it("pending thử quá nhiều lần -> giveup, không add nữa", () => {
    const { intents } = planGateSync({
      local: [local({ attemptCount: 5 })],
      remote: [],
      now,
      maxAttempts: 5,
    });
    expect(intents).toEqual([{ type: "giveup", passcodeId: ID }]);
  });

  it("active + hợp đồng đã kết thúc -> delete", () => {
    const { intents } = planGateSync({
      local: [local({ status: "active", ttlockPasscodeId: 777, tenancyActive: false })],
      remote: [onLock],
      now,
    });
    expect(intents).toEqual([{ type: "delete", passcodeId: ID, ttlockPasscodeId: 777 }]);
  });

  it("active + sắp hết hạn + hợp đồng còn -> extend", () => {
    const { intents } = planGateSync({
      local: [
        local({
          status: "active",
          ttlockPasscodeId: 777,
          endAt: new Date(now.getTime() + 5 * DAY).toISOString(),
        }),
      ],
      remote: [onLock],
      now,
    });
    expect(intents[0]?.type).toBe("extend");
  });

  it("active + còn xa hạn -> không làm gì", () => {
    const { intents } = planGateSync({
      local: [local({ status: "active", ttlockPasscodeId: 777 })],
      remote: [onLock],
      now,
    });
    expect(intents).toEqual([]);
  });

  it("active nhưng đã biến mất khỏi khoá -> settle, bám theo sự thật thiết bị", () => {
    const { intents } = planGateSync({
      local: [local({ status: "active", ttlockPasscodeId: 777 })],
      remote: [],
      now,
    });
    expect(intents).toEqual([{ type: "settle", passcodeId: ID }]);
  });

  it("revoking + còn trên khoá -> delete", () => {
    const { intents } = planGateSync({
      local: [local({ status: "revoking", ttlockPasscodeId: 777 })],
      remote: [onLock],
      now,
    });
    expect(intents).toEqual([{ type: "delete", passcodeId: ID, ttlockPasscodeId: 777 }]);
  });

  it("revoking + đã mất -> settle, không gọi API cho chắc", () => {
    const { intents } = planGateSync({
      local: [local({ status: "revoking", ttlockPasscodeId: 777 })],
      remote: [],
      now,
    });
    expect(intents).toEqual([{ type: "settle", passcodeId: ID }]);
  });

  it("mã lạ MANG tiền tố của app -> orphan", () => {
    const { intents, foreign } = planGateSync({
      local: [],
      remote: [{ keyboardPwdId: 9, keyboardPwdName: "NT-P202-aaaabbbb" }],
      now,
    });
    expect(intents).toEqual([
      { type: "orphan", ttlockPasscodeId: 9, remoteName: "NT-P202-aaaabbbb" },
    ]);
    expect(foreign).toEqual([]);
  });

  /** Cái test khiến chủ trọ dám bật tính năng này. */
  it("mã chủ trọ tự bấm -> KHÔNG sinh intent nào, chỉ đếm", () => {
    const strangers: RemotePasscodeSnapshot[] = [
      { keyboardPwdId: 1, keyboardPwdName: "Mã của mẹ" },
      { keyboardPwdId: 2, keyboardPwdName: null },
      { keyboardPwdId: 3, keyboardPwdName: "khach" },
    ];
    const { intents, foreign } = planGateSync({ local: [], remote: strangers, now });
    expect(intents).toEqual([]);
    expect(foreign).toEqual(strangers);
  });

  it("dòng đã revoked/failed thì bỏ qua, không hồi sinh thành add", () => {
    const { intents } = planGateSync({
      local: [
        local({ id: "a", status: "revoked" }),
        local({ id: "b", status: "failed", remoteName: "NT-P102-bbbbbbbb" }),
      ],
      remote: [],
      now,
    });
    expect(intents).toEqual([]);
  });

  it("khoá rỗng + toàn dòng đã đóng sổ -> không sinh một loạt add", () => {
    const { intents, foreign } = planGateSync({
      local: [local({ status: "revoked" })],
      remote: [],
      now,
    });
    expect(intents).toEqual([]);
    expect(foreign).toEqual([]);
  });

  it("hai mã khác tên không lẫn sang nhau", () => {
    const { intents } = planGateSync({
      local: [
        local({ id: "a", remoteName: "NT-P101-aaaaaaaa" }),
        local({ id: "b", remoteName: "NT-P102-bbbbbbbb" }),
      ],
      remote: [{ keyboardPwdId: 1, keyboardPwdName: "NT-P101-aaaaaaaa" }],
      now,
    });
    expect(intents).toEqual([
      { type: "adopt", passcodeId: "a", ttlockPasscodeId: 1 },
      { type: "add", passcodeId: "b" },
    ]);
  });
});
