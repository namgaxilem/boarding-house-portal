"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { notifyGateCredentialToRevoke } from "@/lib/notify";
import {
  describeError,
  fail,
  invalid,
  type ActionResult,
} from "@/lib/action-result";

import { checkInSchema, checkOutSchema } from "./schema";

/** Check-in: put a tenant into a room and open a tenancy record. */
export async function checkIn(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireAdmin();

  const parsed = checkInSchema.safeParse({
    roomId: formData.get("roomId"),
    tenantId: formData.get("tenantId"),
    isPrimary: formData.get("isPrimary") ?? undefined,
    startDate: formData.get("startDate"),
    expectedEndDate: formData.get("expectedEndDate") ?? undefined,
    deposit: formData.get("deposit"),
    monthlyPrice: formData.get("monthlyPrice"),
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.createTenancy(parsed.data);
  } catch (error) {
    return fail(describeError(error, "Không tạo được hợp đồng."));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/rooms");
  revalidatePath(`/admin/rooms/${parsed.data.roomId}`);
  revalidatePath("/admin/tenants");
  redirect(`/admin/rooms/${parsed.data.roomId}?checkedIn=1`);
}

/** Check-out: close the tenancy. The row stays — that is the room's history. */
export async function checkOut(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireAdmin();

  const parsed = checkOutSchema.safeParse({
    tenancyId: formData.get("tenancyId"),
    endDate: formData.get("endDate"),
    endReason: formData.get("endReason"),
    terminated: formData.get("terminated") ?? undefined,
    depositDeduction: formData.get("depositDeduction") ?? 0,
    depositRefunded: formData.get("depositRefunded") ?? 0,
    settlementNote: formData.get("settlementNote") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);

  const tenancy = await db.getTenancy(parsed.data.tenancyId);
  if (!tenancy) return fail("Không tìm thấy hợp đồng.");

  try {
    await db.endTenancy(parsed.data.tenancyId, {
      endDate: parsed.data.endDate,
      endReason: parsed.data.endReason,
      terminated: parsed.data.terminated,
      depositDeduction: parsed.data.depositDeduction,
      depositRefunded: parsed.data.depositRefunded,
      settlementNote: parsed.data.settlementNote,
    });
  } catch (error) {
    return fail(describeError(error, "Không kết thúc được hợp đồng."));
  }

  // Nhắc xoá mã cổng. CỐ Ý nằm SAU `endTenancy` và cố ý không throw.
  //
  // Trả phòng là bản ghi tài chính: cọc đã kết toán, tiền đã trao tay, nhật ký
  // phòng đã ghi. Một lỗi ở tầng thông báo không được làm Server Action báo đỏ
  // và khiến chủ trọ bấm trả phòng lần thứ hai — lần hai sẽ báo "hợp đồng đã kết
  // thúc" và họ không hiểu chuyện gì. Cùng lập luận với `notify.ts` dòng 18-27.
  try {
    const credential = await db.getGateCredential(tenancy.tenantId);
    if (credential) {
      await notifyGateCredentialToRevoke({
        tenantName: tenancy.tenant.fullName,
        tenantId: tenancy.tenantId,
        roomCode: tenancy.room.code,
        credential,
      });
    }
  } catch (error) {
    console.error("[gate] Không tạo được nhắc xoá mã cổng", error);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/rooms");
  revalidatePath(`/admin/rooms/${tenancy.roomId}`);
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenancy.tenantId}`);
  redirect(`/admin/rooms/${tenancy.roomId}?checkedOut=1`);
}
