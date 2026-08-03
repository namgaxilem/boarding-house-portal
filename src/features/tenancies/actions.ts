"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
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
  });
  if (!parsed.success) return invalid(parsed.error);

  const tenancy = await db.getTenancy(parsed.data.tenancyId);
  if (!tenancy) return fail("Không tìm thấy hợp đồng.");

  try {
    await db.endTenancy(parsed.data.tenancyId, {
      endDate: parsed.data.endDate,
      endReason: parsed.data.endReason,
      terminated: parsed.data.terminated,
    });
  } catch (error) {
    return fail(describeError(error, "Không kết thúc được hợp đồng."));
  }

  revalidatePath("/admin");
  revalidatePath("/admin/rooms");
  revalidatePath(`/admin/rooms/${tenancy.roomId}`);
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenancy.tenantId}`);
  redirect(`/admin/rooms/${tenancy.roomId}?checkedOut=1`);
}
