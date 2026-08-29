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

    DUPLICATE_INVOICE: "Phòng này đã có hoá đơn cho tháng đó. Sửa hoá đơn cũ hoặc huỷ nó trước.",
    DUPLICATE_METER_READING: "Phòng này đã có chỉ số của tháng đó.",
    METER_READING_BACKWARDS:
      "Chỉ số cuối kỳ nhỏ hơn đầu kỳ. Đồng hồ không chạy lùi — kiểm tra lại số vừa gõ.",
    INVOICE_NOT_FOUND: "Không tìm thấy hoá đơn.",
    INVOICE_OTHER_NEEDS_NOTE: "Có khoản phát sinh thì phải ghi lý do.",
    INVOICE_NO_TENANT: "Phòng đang trống nên chưa lập được hoá đơn. Xếp người vào phòng trước.",
    INVOICE_NO_READING:
      "Chưa có chỉ số điện nước của tháng này. Ghi chỉ số trước rồi lập hoá đơn.",
    INVOICE_NOT_DRAFT: "Hoá đơn đã phát hành. Huỷ hoá đơn nếu cần lập lại.",
    INVOICE_ALREADY_PAID: "Hoá đơn này đã được ghi nhận đã thu.",
    INVOICE_VOID: "Hoá đơn đã huỷ, không đổi được nữa.",

    PAYMENT_ACCOUNT_NOT_FOUND: "Không tìm thấy cách nhận tiền này.",
    PAYMENT_QR_UPLOAD_FORBIDDEN:
      "Không có quyền tải ảnh QR lên. Đăng nhập lại bằng tài khoản chủ trọ.",
    PAYMENT_QR_REQUIRED: "Chọn ảnh QR để tải lên.",

    MAINTENANCE_NOT_FOUND: "Không tìm thấy phiếu báo hỏng này.",
    MAINTENANCE_FORBIDDEN: "Bạn chỉ sửa hoặc đóng được phiếu do chính mình gửi.",
    MAINTENANCE_LOCKED:
      "Chủ trọ đã bắt đầu xử lý phiếu này nên không sửa được nữa. Gửi phiếu mới nếu có thêm thông tin.",
    MAINTENANCE_ALREADY_CLOSED: "Phiếu này đã đóng rồi. Tải lại trang để xem.",
    MAINTENANCE_PHOTO_FORBIDDEN:
      "Không có quyền thêm hoặc xoá ảnh ở phiếu này. Phiếu đã đóng, hoặc ảnh do người khác tải lên.",
    MAINTENANCE_NO_ROOM:
      "Bạn chưa được xếp vào phòng nào nên chưa gửi báo hỏng được. Liên hệ chủ trọ.",

    DEDUCTION_OVER_DEPOSIT:
      "Số trừ vào cọc lớn hơn số cọc đang giữ. Phần người thuê còn nợ vượt quá tiền cọc thì lập một hoá đơn riêng.",
    DEDUCTION_NEEDS_NOTE: "Có trừ vào cọc thì phải ghi lý do.",
  };

  return messages[code] ?? fallback;
}
