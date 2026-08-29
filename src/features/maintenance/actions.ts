"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin, requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  describeError,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { notifyMaintenanceCreated, notifyMaintenanceUpdated } from "@/lib/notify";

import {
  adminRequestSchema,
  closeSchema,
  statusSchema,
  tenantRequestSchema,
} from "./schema";

/**
 * Vòng đời một phiếu báo hỏng:
 *
 *   chờ xử lý → đang sửa → đã sửa xong → đã đóng
 *
 * Ai làm được gì:
 *   - Người thuê  gửi phiếu cho PHÒNG MÌNH ĐANG Ở; sửa phiếu của mình khi còn
 *                 "chờ xử lý"; đóng phiếu của mình bất cứ lúc nào.
 *   - Chủ trọ     làm mọi thứ, với mọi phiếu.
 *
 * Hai việc của người thuê đi qua SQL function (`update_my_maintenance_request`,
 * `close_maintenance_request`) chứ không qua UPDATE thẳng. Lý do nằm ở migration
 * 0008: RLS lọc DÒNG chứ không lọc CỘT, nên một policy UPDATE cho người thuê sẽ
 * đồng thời cho họ tự đặt trạng thái "đã sửa xong".
 */

function revalidateMaintenance(requestId?: string) {
  revalidatePath("/admin/maintenance");
  revalidatePath("/admin");
  revalidatePath("/me/maintenance");
  revalidatePath("/me");
  if (requestId) {
    revalidatePath(`/admin/maintenance/${requestId}`);
    revalidatePath(`/me/maintenance/${requestId}`);
  }
}

/* -------------------------------------------------------------------------- */
/*  Người thuê                                                                */
/* -------------------------------------------------------------------------- */

export async function createMyRequest(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  const user = await requireUser();

  const parsed = tenantRequestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    priority: formData.get("priority"),
  });
  if (!parsed.success) return invalid(parsed.error);

  // Phòng suy ra từ hợp đồng, KHÔNG lấy từ form. Form gửi lên là dữ liệu người
  // dùng kiểm soát; hợp đồng thì không.
  const tenancy = await db.getActiveTenancyForTenant(user.id);
  if (!tenancy) {
    return fail(
      describeError(
        "MAINTENANCE_NO_ROOM",
        "Bạn chưa được xếp vào phòng nào nên chưa gửi báo hỏng được.",
      ),
    );
  }

  let requestId: string;
  try {
    const created = await db.createMaintenanceRequest({
      ...parsed.data,
      roomId: tenancy.roomId,
      reportedBy: user.id,
    });
    requestId = created.id;
  } catch (error) {
    return fail(describeError(error, "Không gửi được báo hỏng."));
  }

  const detail = await db.getMaintenanceRequest(requestId);
  if (detail) await notifyMaintenanceCreated(detail, user);

  revalidateMaintenance(requestId);
  redirect(`/me/maintenance/${requestId}?created=1`);
}

export async function updateMyRequest(
  requestId: string,
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireUser();

  const parsed = tenantRequestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    priority: formData.get("priority"),
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    // Hàm SQL tự kiểm "phiếu của chính tôi" và "còn chờ xử lý" — không kiểm lại
    // ở đây, để hai nơi không bao giờ bất đồng về điều kiện.
    await db.updateOwnMaintenanceRequest(requestId, parsed.data);
  } catch (error) {
    return fail(describeError(error, "Không sửa được phiếu báo hỏng."));
  }

  revalidateMaintenance(requestId);
  redirect(`/me/maintenance/${requestId}?updated=1`);
}

/* -------------------------------------------------------------------------- */
/*  Đóng phiếu — cả hai bên                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Đóng phiếu.
 *
 * Một action cho cả người thuê lẫn chủ trọ, vì `close_maintenance_request()` đã
 * biết ai được đóng phiếu nào. Viết hai action rồi để một cái quên kiểm là cách
 * lỗi phân quyền vẫn hay xảy ra.
 */
export async function closeRequest(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const user = await requireUser();

  const parsed = closeSchema.safeParse({
    requestId: formData.get("requestId"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);

  // Đọc trạng thái TRƯỚC khi đóng: chủ trọ đóng một phiếu vừa báo "đã sửa xong"
  // là bước dọn dẹp, không phải tin mới — người thuê đã được báo ở lần trước rồi.
  const before = await db.getMaintenanceRequest(parsed.data.requestId);

  try {
    await db.closeMaintenanceRequest(parsed.data.requestId, parsed.data.note);
  } catch (error) {
    return fail(describeError(error, "Không đóng được phiếu báo hỏng."));
  }

  const silent = user.role === "admin" && before?.status === "resolved";
  if (!silent) {
    const detail = await db.getMaintenanceRequest(parsed.data.requestId);
    if (detail) await notifyMaintenanceUpdated(detail, user);
  }

  revalidateMaintenance(parsed.data.requestId);
  return ok("Đã đóng phiếu.");
}

/* -------------------------------------------------------------------------- */
/*  Chủ trọ                                                                   */
/* -------------------------------------------------------------------------- */

export async function createRequestAsAdmin(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  const user = await requireAdmin();

  const parsed = adminRequestSchema.safeParse({
    roomId: formData.get("roomId"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    priority: formData.get("priority"),
  });
  if (!parsed.success) return invalid(parsed.error);

  let requestId: string;
  try {
    const created = await db.createMaintenanceRequest({
      ...parsed.data,
      reportedBy: user.id,
    });
    requestId = created.id;
  } catch (error) {
    return fail(describeError(error, "Không tạo được phiếu báo hỏng."));
  }

  // Người thuê phải biết cuộc gọi của họ đã được ghi lại. Phiếu này có
  // `reported_by` trỏ về chủ trọ, nên thông báo đi tới người ĐANG Ở phòng đó —
  // xem `maintenanceCounterparties` trong lib/notify.ts.
  const detail = await db.getMaintenanceRequest(requestId);
  if (detail) await notifyMaintenanceCreated(detail, user);

  revalidateMaintenance(requestId);
  redirect(`/admin/maintenance/${requestId}?created=1`);
}

export async function updateRequestAsAdmin(
  requestId: string,
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireAdmin();

  const parsed = adminRequestSchema.safeParse({
    roomId: formData.get("roomId"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    priority: formData.get("priority"),
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.updateMaintenanceRequest(requestId, parsed.data);
  } catch (error) {
    return fail(describeError(error, "Không cập nhật được phiếu báo hỏng."));
  }

  revalidateMaintenance(requestId);
  redirect(`/admin/maintenance/${requestId}?updated=1`);
}

/**
 * Đổi trạng thái, kèm ghi chú cho người thuê và (tuỳ chọn) chi phí sửa.
 *
 * Chi phí đi vào `room_events` — xem `setMaintenanceStatus` trong adapter.
 */
export async function setRequestStatus(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const user = await requireAdmin();

  const parsed = statusSchema.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    resolutionNote: formData.get("resolutionNote") ?? undefined,
    cost: formData.get("cost") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);

  let detail;
  try {
    detail = await db.setMaintenanceStatus(parsed.data.requestId, parsed.data.status, {
      resolutionNote: parsed.data.resolutionNote,
      cost: parsed.data.cost,
    });
  } catch (error) {
    return fail(describeError(error, "Không đổi được trạng thái phiếu."));
  }

  await notifyMaintenanceUpdated(detail, user);

  revalidateMaintenance(parsed.data.requestId);
  return ok("Đã cập nhật và báo cho người thuê.");
}

export async function deleteRequest(formData: FormData): Promise<void> {
  await requireAdmin();

  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;

  await db.deleteMaintenanceRequest(requestId);

  revalidateMaintenance();
  redirect("/admin/maintenance?deleted=1");
}

/* -------------------------------------------------------------------------- */
/*  Ảnh đính kèm                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Giới hạn ảnh — bốn tầng, cố ý dư.
 *
 *   1. Trình duyệt từ chối file quá lớn TRƯỚC khi giải mã (xem PhotoAttach).
 *   2. Trình duyệt thu ảnh về ≤1600px / ~300–500KB rồi mới gửi.
 *   3. Server Action (dưới đây) kiểm lại kiểu và kích thước — Server Action là
 *      endpoint POST công khai, ai biết id cũng gọi được, không tin client.
 *   4. Bucket `maintenance-photos` chốt 5MB + đúng ba kiểu ảnh ở tầng Supabase.
 *
 * Bỏ tầng 3 thì tầng 1 và 2 chỉ là gợi ý.
 */
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MAX_PER_UPLOAD = 5;
/** Trần mỗi phiếu. Sáu tấm là quá đủ để tả một cái vòi hỏng. */
const PHOTO_MAX_PER_REQUEST = 6;

export async function uploadMaintenancePhotos(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  // requireUser, KHÔNG requireAdmin: người thuê là bên chụp được ảnh.
  // Ai đính được vào phiếu nào do `can_attach_maintenance()` quyết định ở tầng
  // database — không kiểm lại ở đây để hai nơi không bất đồng.
  const user = await requireUser();

  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return fail("Thiếu thông tin phiếu.");

  const files = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) return fail("Chưa chọn ảnh nào.");
  if (files.length > PHOTO_MAX_PER_UPLOAD) {
    return fail(`Mỗi lần tải tối đa ${PHOTO_MAX_PER_UPLOAD} ảnh.`);
  }

  for (const file of files) {
    if (!PHOTO_TYPES.includes(file.type)) {
      return fail(`"${file.name}" không phải ảnh JPG/PNG/WebP.`);
    }
    if (file.size > PHOTO_MAX_BYTES) {
      return fail(`"${file.name}" vẫn quá nặng sau khi nén. Chụp lại hoặc chọn ảnh khác.`);
    }
  }

  const already = await db.countMaintenancePhotos(requestId);
  if (already + files.length > PHOTO_MAX_PER_REQUEST) {
    return fail(
      `Phiếu này đã có ${already} ảnh, tối đa ${PHOTO_MAX_PER_REQUEST}. Xoá bớt trước khi thêm.`,
    );
  }

  // Tuần tự, không song song: mỗi lần lên là một lần Storage kiểm quyền, và một
  // ảnh hỏng không được kéo theo những ảnh đã lên trước đó.
  let uploaded = 0;
  for (const file of files) {
    try {
      await db.addMaintenancePhoto(requestId, user.id, file);
      uploaded += 1;
    } catch (error) {
      revalidateMaintenance(requestId);
      const detail = describeError(error, "Không tải được ảnh lên.");
      return fail(uploaded > 0 ? `Đã tải ${uploaded} ảnh, rồi dừng lại: ${detail}` : detail);
    }
  }

  revalidateMaintenance(requestId);
  return ok(`Đã thêm ${uploaded} ảnh.`);
}

export async function deleteMaintenancePhoto(formData: FormData): Promise<void> {
  await requireUser();

  const photoId = String(formData.get("photoId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");
  if (!photoId) return;

  // RLS quyết định: chủ trọ xoá ảnh nào cũng được, người thuê chỉ ảnh của chính
  // mình và chỉ khi phiếu còn mở.
  await db.deleteMaintenancePhoto(photoId);
  revalidateMaintenance(requestId);
}
