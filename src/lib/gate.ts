import { houseConfig } from "@/config/site";
import type { GatePasscodeStatus } from "@/types";

/**
 * ============================================================================
 *  Khoá cổng thông minh — phần LOGIC THUẦN
 * ============================================================================
 *
 * File này cố ý KHÔNG có `server-only`, không `fetch`, không `db`. Lý do nằm ở
 * `vitest.config.ts` dòng 15: test chỉ chạy cho `src/lib/**\/*.test.ts`. Logic
 * đặt trong `src/features/` là logic KHÔNG BAO GIỜ ĐƯỢC TEST.
 *
 * Nên mọi quyết định mà sai một chỗ là hỏng thật — sinh mã, tính hạn hiệu lực,
 * và nhất là QUYẾT ĐỊNH XOÁ MÃ NÀO — đều nằm ở đây, dưới dạng hàm thuần trên
 * object thường. Phần chạm mạng nằm ở `src/lib/ttlock.ts`.
 */

const gate = houseConfig.gate;
const TIME_ZONE = houseConfig.timeZone;

/* -------------------------------------------------------------------------- */
/*  Tên mã trên khoá                                                          */
/* -------------------------------------------------------------------------- */

/**
 * 'NT-P101-3f9a2c1b' — tiền tố cố định, mã phòng để người đọc hiểu, 8 ký tự đầu
 * của id dòng để máy khớp.
 *
 * Cái tên này gánh hai việc, và cả hai đều quan trọng hơn vẻ ngoài của nó:
 *
 *   1. Khi `keyboardPwd/add` hết giờ mà không biết đã tạo hay chưa, lần đồng bộ
 *      sau liệt kê mã trên khoá rồi khớp theo tên này để gỡ mù. Không có nó thì
 *      không có cách nào phân biệt "chưa tạo" với "tạo rồi nhưng mất phản hồi".
 *   2. Phân biệt mã DO APP CẤP với mã chủ trọ tự bấm trong app TTLock.
 */
export function buildPasscodeName(
  roomCode: string,
  passcodeId: string,
  prefix: string = gate.passcodeNamePrefix,
): string {
  // Bỏ mọi ký tự có thể làm hỏng việc tách chuỗi. Mã phòng thực tế là 'P101',
  // nhưng một mã phòng có dấu gạch ngang sẽ làm `parsePasscodeName` hiểu sai.
  const room = roomCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "NA";
  return `${prefix}-${room}-${passcodeId.replace(/-/g, "").slice(0, 8)}`;
}

export interface ParsedPasscodeName {
  prefix: string;
  roomCode: string;
  idPrefix: string;
}

/** `null` khi tên không phải do app này đặt. */
export function parsePasscodeName(
  name: string | null | undefined,
  prefix: string = gate.passcodeNamePrefix,
): ParsedPasscodeName | null {
  if (!name) return null;
  const parts = name.trim().split("-");
  if (parts.length !== 3) return null;
  const [head, room, id] = parts;
  if (head !== prefix) return null;
  if (!/^[A-Z0-9]+$/.test(room)) return null;
  if (!/^[0-9a-f]{8}$/.test(id)) return null;
  return { prefix: head, roomCode: room, idPrefix: id };
}

/**
 * Cổng chặn duy nhất giữa app và việc xoá nhầm mã của người khác.
 *
 * Mọi lệnh xoá trong `planGateSync` đều phải đi qua hàm này. Mã chủ trọ tự bấm
 * trong app TTLock ("Mã của mẹ", "khách") trả về `false` và không bao giờ bị
 * động tới.
 */
export function isOurPasscodeName(name: string | null | undefined): boolean {
  return parsePasscodeName(name) !== null;
}

/* -------------------------------------------------------------------------- */
/*  Sinh mã                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Những mã không bao giờ được cấp, kể cả khi ngẫu nhiên ra đúng chúng.
 *
 * Không phải vì thuật toán đoán mã — cổng sắt không có ai đứng thử một triệu
 * lần. Mà vì một mã như 123456 khiến người thuê tưởng chủ trọ đặt tạm rồi quên,
 * và vì đó là mã đầu tiên bất kỳ ai đi ngang qua cũng thử.
 */
const WEAK_PATTERNS = [/^(\d)\1*$/, /^0123456789/, /^123456/, /^654321/, /^9876543210/];

function isWeak(code: string): boolean {
  if (WEAK_PATTERNS.some((re) => re.test(code))) return true;
  // Dãy tăng hoặc giảm liên tiếp: 234567, 876543.
  const digits = [...code].map(Number);
  const stepUp = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const stepDown = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  return stepUp || stepDown;
}

/** Trả về một chữ số 0–9. Tách ra thành tham số để test tiêm được dãy cố định. */
export type DigitSource = () => number;

const cryptoDigits: DigitSource = () => {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  // 250 = 25 * 10. Bỏ 250–255 để mọi chữ số có xác suất bằng nhau; lấy modulo
  // thẳng trên 0–255 thì 0–5 ra nhiều hơn 6–9 khoảng 2%.
  return buf[0] >= 250 ? cryptoDigits() : buf[0] % 10;
};

/**
 * Mã `length` chữ số, không yếu, không trùng mã nào đang sống trên cùng ổ khoá.
 *
 * Trùng mã là lỗi nghiêm trọng hơn vẻ ngoài: TTLock sẽ nhận, và rồi hai người
 * thuê cùng mở được cổng bằng một mã, còn nhật ký ra vào thì gán nhầm người.
 */
export function generatePasscode(
  length: number = gate.pinLength,
  taken: readonly string[] = [],
  digit: DigitSource = cryptoDigits,
): string {
  const used = new Set(taken);
  // Trần cứng để không bao giờ quay vô hạn khi `taken` phủ gần hết không gian
  // mã (không xảy ra với nhà trọ mười phòng, nhưng một vòng lặp không có lối ra
  // là một vòng lặp treo cả tiến trình).
  for (let attempt = 0; attempt < 500; attempt += 1) {
    let code = "";
    for (let i = 0; i < length; i += 1) code += digit();
    if (!isWeak(code) && !used.has(code)) return code;
  }
  throw new Error("GATE_PASSCODE_EXHAUSTED");
}

/* -------------------------------------------------------------------------- */
/*  Hạn hiệu lực                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Offset thật của múi giờ nhà trọ tại một thời điểm.
 *
 * Việt Nam không có giờ mùa hè nên con số luôn là +07:00, nhưng viết đúng cách
 * thì đổi `houseConfig.timeZone` sang chỗ khác vẫn chạy, và không tốn thêm gì.
 */
function offsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000;
}

/** 'yyyy-MM-dd' -> đúng 23:59:59 của ngày đó THEO GIỜ NHÀ TRỌ. */
export function endOfHouseDay(isoDate: string): Date {
  const guess = new Date(`${isoDate}T23:59:59Z`);
  return new Date(guess.getTime() - offsetMinutes(guess) * 60_000);
}

const DAY_MS = 86_400_000;

export interface PasscodeWindow {
  startAt: Date;
  endAt: Date;
  /** `true` khi `expectedEndDate` là thứ cắt ngắn cửa sổ, không phải số ngày mặc định. */
  cappedByContract: boolean;
}

/**
 * Hạn hiệu lực của một mã.
 *
 *     end_at = min(now + pinWindowDays, expected_end_date + graceDays)
 *
 * Hai vế chống hai kiểu hỏng khác nhau, và cả hai kiểu đều xảy ra thật:
 *
 *   - Chỉ có vế trái: chủ trọ đuổi người vì nợ tiền, mã vẫn sống thêm 60 ngày.
 *     Đúng cái lỗ hổng tính năng này sinh ra để vá.
 *   - Chỉ có vế phải: hợp đồng gia hạn miệng bên chén trà, chủ trọ quên sửa app,
 *     người thuê đứng ngoài cổng lúc nửa đêm. BỊ KHOÁ NGOÀI TỆ HƠN MÃ CŨ CÒN
 *     SỐNG — mã cũ là rủi ro, khoá ngoài là sự cố vào giờ không ai nghe máy.
 *
 * `graceDays` là đệm để hôm gia hạn không ai bị nhốt ngoài cổng.
 */
export function passcodeWindow(
  now: Date,
  expectedEndDate: string | null = null,
  opts: { windowDays?: number; graceDays?: number } = {},
): PasscodeWindow {
  const windowDays = opts.windowDays ?? gate.pinWindowDays;
  const graceDays = opts.graceDays ?? gate.graceDays;

  const rolling = new Date(now.getTime() + windowDays * DAY_MS);
  let endAt = rolling;
  let cappedByContract = false;

  if (expectedEndDate) {
    const contract = new Date(endOfHouseDay(expectedEndDate).getTime() + graceDays * DAY_MS);
    if (contract < rolling) {
      endAt = contract;
      cappedByContract = true;
    }
  }

  // Hợp đồng đã hết hạn từ trước mà vẫn cấp mã: dữ liệu sai ở đâu đó. Cấp một mã
  // sống đúng một ngày thay vì ném lỗi — chủ trọ đang đứng cạnh người thuê, và
  // một mã ngắn hạn còn dùng được, còn một Server Action báo đỏ thì không.
  const floor = new Date(now.getTime() + DAY_MS);
  if (endAt <= floor) {
    endAt = floor;
    cappedByContract = true;
  }

  return { startAt: now, endAt, cappedByContract };
}

/** Còn dưới `pinRenewBeforeDays` ngày thì cron đẩy hạn ra xa. */
export function needsExtension(
  endAt: Date,
  now: Date,
  beforeDays: number = gate.pinRenewBeforeDays,
): boolean {
  return endAt.getTime() - now.getTime() < beforeDays * DAY_MS;
}

/* -------------------------------------------------------------------------- */
/*  Con trỏ kéo nhật ký                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Khoảng thời gian cần kéo nhật ký về.
 *
 * Kéo LÙI thêm vài tiếng so với bản ghi mới nhất đang có, vì đồng hồ ổ khoá và
 * đồng hồ máy chủ không bao giờ khớp tuyệt đối. Phần chồng lấn bị unique index
 * `(lock_id, ttlock_record_id)` nuốt — rẻ hơn nhiều so với việc mất bản ghi.
 *
 * Lần chạy đầu (`latestAt` null) kẹp ở 7 ngày, không kéo cả năm về.
 */
export function recordCursor(
  latestAt: string | null,
  now: Date,
  opts: { overlapHours?: number; firstRunDays?: number } = {},
): { startAt: Date; endAt: Date } {
  const overlapHours = opts.overlapHours ?? gate.recordOverlapHours;
  const firstRunDays = opts.firstRunDays ?? gate.recordFirstRunDays;

  if (!latestAt) {
    return { startAt: new Date(now.getTime() - firstRunDays * DAY_MS), endAt: now };
  }

  const latest = new Date(latestAt);
  const startAt = new Date(latest.getTime() - overlapHours * 3_600_000);
  // `latest` ở tương lai nghĩa là đồng hồ ổ khoá chạy nhanh. Không được trả về
  // một khoảng ngược, TTLock sẽ từ chối và cron đứng im mãi mãi.
  return { startAt: startAt > now ? new Date(now.getTime() - overlapHours * 3_600_000) : startAt, endAt: now };
}

/* -------------------------------------------------------------------------- */
/*  Đối soát — bộ não của tính năng                                           */
/* -------------------------------------------------------------------------- */

/** Một dòng `gate_passcodes` còn sống, rút gọn cho việc đối soát. */
export interface LocalPasscodeSnapshot {
  id: string;
  remoteName: string;
  ttlockPasscodeId: number | null;
  status: GatePasscodeStatus;
  endAt: string;
  /** Hợp đồng gắn với mã này còn hiệu lực không. Mã khách không có hợp đồng → `true`. */
  tenancyActive: boolean;
  expectedEndDate: string | null;
  attemptCount: number;
}

/** Một mã đang thật sự nằm trên ổ khoá, đọc về từ `/v3/lock/listKeyboardPwd`. */
export interface RemotePasscodeSnapshot {
  keyboardPwdId: number;
  keyboardPwdName: string | null;
}

export type GateSyncIntent =
  /** Chưa có trên khoá — đẩy lên. */
  | { type: "add"; passcodeId: string }
  /** Đã có trên khoá rồi, chỉ là lần trước mất phản hồi. Ghi nhận id, chuyển active. */
  | { type: "adopt"; passcodeId: string; ttlockPasscodeId: number }
  /** Hợp đồng còn hiệu lực, mã sắp hết hạn — đẩy hạn ra xa. */
  | { type: "extend"; passcodeId: string; ttlockPasscodeId: number; endAt: Date }
  /** Phải biến mất khỏi khoá. */
  | { type: "delete"; passcodeId: string; ttlockPasscodeId: number }
  /** Đã không còn trên khoá — chỉ cần đóng sổ, không gọi API. */
  | { type: "settle"; passcodeId: string }
  /** Mang tiền tố của app nhưng không còn dòng nào sống. Xoá + báo chủ trọ. */
  | { type: "orphan"; ttlockPasscodeId: number; remoteName: string }
  /** Thử quá nhiều lần. Chuyển 'failed' và báo người xem. */
  | { type: "giveup"; passcodeId: string };

export interface GateSyncPlan {
  intents: GateSyncIntent[];
  /**
   * Mã trên khoá KHÔNG mang tiền tố của app. Không sinh intent nào — app không
   * bao giờ đụng tới. Trả về để giao diện hiện "tạo ngoài app".
   */
  foreign: RemotePasscodeSnapshot[];
}

/**
 * So "khoá đang có gì" với "hợp đồng nói phải có gì", rồi ra danh sách việc.
 *
 * Hàm THUẦN, cố ý. Đây là đoạn có thể xoá nhầm mã đang dùng của người thuê, nên
 * nó phải test vét cạn được mà không cần mock, không cần mạng, không cần phần
 * cứng. Người gọi chỉ việc thi hành từng intent theo thứ tự.
 */
export function planGateSync(input: {
  local: readonly LocalPasscodeSnapshot[];
  remote: readonly RemotePasscodeSnapshot[];
  now: Date;
  maxAttempts?: number;
}): GateSyncPlan {
  const maxAttempts = input.maxAttempts ?? gate.maxSyncAttempts;
  const intents: GateSyncIntent[] = [];

  // Khớp theo TÊN, không theo id: lúc `pending` thì id còn null, và tên chính là
  // thứ duy nhất tồn tại ở cả hai phía.
  const remoteByName = new Map<string, RemotePasscodeSnapshot>();
  for (const row of input.remote) {
    if (row.keyboardPwdName) remoteByName.set(row.keyboardPwdName, row);
  }
  const matchedNames = new Set<string>();

  for (const row of input.local) {
    // 'revoked' đã đóng sổ. 'failed' đang chờ người xem — cron không tự thử lại,
    // nếu không nó lại chạy đúng vào cái vòng đã thất bại năm lần.
    if (row.status === "revoked" || row.status === "failed") continue;

    const remote = remoteByName.get(row.remoteName);
    if (remote) matchedNames.add(row.remoteName);
    const ttlockId = remote?.keyboardPwdId ?? row.ttlockPasscodeId;

    if (row.status === "pending") {
      if (remote) {
        intents.push({ type: "adopt", passcodeId: row.id, ttlockPasscodeId: remote.keyboardPwdId });
      } else if (row.attemptCount >= maxAttempts) {
        intents.push({ type: "giveup", passcodeId: row.id });
      } else {
        intents.push({ type: "add", passcodeId: row.id });
      }
      continue;
    }

    if (row.status === "revoking") {
      if (remote) {
        intents.push({ type: "delete", passcodeId: row.id, ttlockPasscodeId: remote.keyboardPwdId });
      } else {
        // Không còn trên khoá. Mục tiêu đã đạt — đóng sổ, đừng gọi API để "chắc".
        intents.push({ type: "settle", passcodeId: row.id });
      }
      continue;
    }

    // status === 'active'
    if (!remote) {
      // Ai đó đã xoá tay trong app TTLock. Bám theo sự thật của thiết bị.
      intents.push({ type: "settle", passcodeId: row.id });
      continue;
    }

    if (!row.tenancyActive) {
      intents.push({ type: "delete", passcodeId: row.id, ttlockPasscodeId: remote.keyboardPwdId });
      continue;
    }

    if (ttlockId !== null && needsExtension(new Date(row.endAt), input.now)) {
      const next = passcodeWindow(input.now, row.expectedEndDate);
      // Cửa sổ mới không dài hơn cửa sổ cũ thì gia hạn là lời gọi thừa: hợp đồng
      // đã tới hạn và cột `expected_end_date` đang chặn — đúng như thiết kế.
      if (next.endAt.getTime() > new Date(row.endAt).getTime()) {
        intents.push({
          type: "extend",
          passcodeId: row.id,
          ttlockPasscodeId: ttlockId,
          endAt: next.endAt,
        });
      }
    }
  }

  const foreign: RemotePasscodeSnapshot[] = [];
  for (const row of input.remote) {
    if (matchedNames.has(row.keyboardPwdName ?? "")) continue;
    if (isOurPasscodeName(row.keyboardPwdName)) {
      intents.push({
        type: "orphan",
        ttlockPasscodeId: row.keyboardPwdId,
        remoteName: row.keyboardPwdName ?? "",
      });
    } else {
      // Mã chủ trọ tự bấm trong app TTLock. KHÔNG ĐỘNG TỚI. Đây là điều kiện để
      // họ tin được tính năng này.
      foreign.push(row);
    }
  }

  return { intents, foreign };
}
