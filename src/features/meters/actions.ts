"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  describeError,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";

import { meterReadingSchema } from "./schema";

/**
 * Ghi chỉ số điện nước. Chỉ chủ trọ.
 *
 * Người thuê KHÔNG tự khai chỉ số: con số này ra tiền, và ai khai thì người đó
 * có động cơ khai thấp. RLS trên `meter_readings` chỉ mở INSERT/UPDATE cho admin,
 * nên kể cả gọi thẳng Server Action cũng không ghi được.
 */
export async function saveMeterReading(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const parsed = meterReadingSchema.safeParse({
    roomId: formData.get("roomId"),
    period: formData.get("period"),
    electricStart: formData.get("electricStart"),
    electricEnd: formData.get("electricEnd"),
    waterStart: formData.get("waterStart"),
    waterEnd: formData.get("waterEnd"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.saveMeterReading(parsed.data);
  } catch (error) {
    return fail(describeError(error, "Không lưu được chỉ số điện nước."));
  }

  revalidatePath("/admin/meters");
  revalidatePath(`/admin/rooms/${parsed.data.roomId}`);
  revalidatePath("/me/room");
  return ok("Đã lưu chỉ số.");
}

export async function deleteMeterReading(formData: FormData): Promise<void> {
  await requireAdmin();

  const readingId = String(formData.get("readingId") ?? "");
  const roomId = String(formData.get("roomId") ?? "");
  if (!readingId) return;

  await db.deleteMeterReading(readingId);

  revalidatePath("/admin/meters");
  if (roomId) revalidatePath(`/admin/rooms/${roomId}`);
  revalidatePath("/me/room");
}
