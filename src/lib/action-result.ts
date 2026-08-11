/**
 * Uniform return shape for every Server Action.
 *
 * Actions never throw raw database errors at the UI — they translate them into a
 * message a landlord can read, and return field errors so forms can highlight
 * the offending input.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type FormState<T = void> = ActionResult<T> | null;

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data: data as T };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

interface ZodLikeError {
  issues: { path: PropertyKey[]; message: string }[];
}

/**
 * Turn a ZodError into the ActionResult shape.
 *
 * Built from `issues` rather than `flatten()` because that helper moved between
 * zod 3 and 4; `issues` is stable across both.
 */
export function invalid(
  error: ZodLikeError,
  message = "Dữ liệu chưa hợp lệ, kiểm tra lại các ô được tô đỏ.",
): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: message, fieldErrors };
}

/** Maps the error codes adapters throw into Vietnamese the landlord can act on. */
export function describeError(error: unknown, fallback: string): string {
  const code = error instanceof Error ? error.message : String(error);

  const messages: Record<string, string> = {
    DUPLICATE_ROOM_CODE: "Mã phòng này đã tồn tại. Chọn mã khác.",
    DUPLICATE_EMAIL: "Email này đã được dùng cho tài khoản khác.",
    DUPLICATE_ID_NUMBER: "Số CCCD/CMND này đã gắn với một người thuê khác.",
    DUPLICATE_PHONE: "Số điện thoại này đã gắn với một người thuê khác.",
    INVALID_ID_NUMBER: "Số CCCD phải có 12 số, hoặc CMND cũ 9 số.",
    INVALID_PHONE: "Số điện thoại phải có 10 số và bắt đầu bằng 0.",
    ROOM_NOT_FOUND: "Không tìm thấy phòng.",
    ROOM_OCCUPIED: "Phòng đang có người ở. Cho trả phòng trước khi xoá.",
    ROOM_FULL: "Phòng đã đủ số người tối đa.",
    TENANT_NOT_FOUND: "Không tìm thấy người thuê.",
    TENANT_ALREADY_RENTING: "Người này đang thuê một phòng khác.",
    TENANT_HAS_ACTIVE_TENANCY: "Người này đang thuê phòng. Cho trả phòng trước khi xoá.",
    TENANCY_NOT_FOUND: "Không tìm thấy hợp đồng.",
    TENANCY_ALREADY_ENDED: "Hợp đồng này đã kết thúc rồi.",
    END_BEFORE_START: "Ngày trả phòng không được trước ngày nhận phòng.",
    WIFI_NOT_FOUND: "Không tìm thấy mạng wifi.",
    PHOTO_UPLOAD_FORBIDDEN:
      "Không có quyền tải ảnh lên. Đăng nhập lại bằng tài khoản chủ trọ.",

    ID_PHOTO_UPLOAD_FORBIDDEN:
      "Không tải được ảnh giấy tờ. Đăng xuất rồi đăng nhập lại và thử lần nữa.",
    ID_DOCUMENT_PENDING_EXISTS:
      "Bạn đang có một hồ sơ chờ chủ trọ duyệt. Xoá hồ sơ cũ trước khi gửi cái mới.",
    ID_DOCUMENT_NOT_FOUND: "Không tìm thấy hồ sơ giấy tờ này.",
    ID_DOCUMENT_ALREADY_REVIEWED: "Hồ sơ này đã được xử lý rồi. Tải lại trang để xem.",
    ID_DOCUMENT_NO_NUMBER: "Hồ sơ thiếu số CCCD nên không duyệt được.",
  };

  return messages[code] ?? fallback;
}
