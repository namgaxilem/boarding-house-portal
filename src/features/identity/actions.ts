"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  describeError,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";

import { ID_PHOTO_POLICY as POLICY, checkUploadFile } from "@/lib/upload-policy";

import { idDocumentSchema, rejectIdDocumentSchema } from "./schema";

function revalidateIdentity() {
  revalidatePath("/me/identity");
  revalidatePath("/me/profile");
  revalidatePath("/admin/identity");
  revalidatePath("/admin/tenants");
}

function readPhoto(formData: FormData, field: string) {
  const entry = formData.get(field);
  return entry instanceof File && entry.size > 0 ? entry : null;
}

/**
 * Người thuê gửi CCCD lên chờ duyệt.
 *
 * Cố ý KHÔNG ghi thẳng vào `profiles.id_number`. Policy `profiles_update_own`
 * (migration 0004) chặn người thuê tự sửa số CCCD, và đó là thứ duy nhất ngăn
 * một người khai số của người khác. Duyệt xong chủ trọ mới chép sang.
 */
export async function submitIdDocument(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const user = await requireUser();

  const parsed = idDocumentSchema.safeParse({
    idNumber: formData.get("idNumber") ?? "",
    oldIdNumber: formData.get("oldIdNumber") ?? undefined,
    fullName: formData.get("fullName") ?? undefined,
    dateOfBirth: formData.get("dateOfBirth") ?? undefined,
    issuedOn: formData.get("issuedOn") ?? undefined,
    gender: formData.get("gender") ?? undefined,
    residence: formData.get("residence") ?? undefined,
    source: formData.get("source") ?? "manual",
  });

  if (!parsed.success) return invalid(parsed.error);

  const front = readPhoto(formData, "front");
  const back = readPhoto(formData, "back");

  // Bắt buộc cả hai mặt: chủ trọ cần ảnh mặt sau để đối chiếu đặc điểm nhận dạng
  // và ngày cấp khi khai báo tạm trú.
  if (!front || !back) {
    return fail("Cần đủ ảnh cả hai mặt của thẻ.");
  }

  for (const [label, file] of [
    ["mặt trước", front],
    ["mặt sau", back],
  ] as const) {
    const problem = checkUploadFile(file, POLICY, `${label} của thẻ`);
    if (problem) return fail(problem);
  }

  try {
    await db.createIdDocument(user.id, parsed.data, front, back);
  } catch (error) {
    return fail(describeError(error, "Không gửi được hồ sơ. Thử lại sau."));
  }

  revalidateIdentity();
  return ok("Đã gửi. Chủ trọ sẽ kiểm tra và duyệt trong ít ngày tới.");
}

/** Người thuê rút lại hồ sơ chưa duyệt để quét lại. RLS chặn nếu đã duyệt. */
export async function withdrawIdDocument(formData: FormData): Promise<void> {
  await requireUser();

  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return;

  await db.deleteIdDocument(documentId);
  revalidateIdentity();
}

export async function approveIdDocument(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return fail("Thiếu mã hồ sơ.");

  try {
    await db.approveIdDocument(documentId);
  } catch (error) {
    return fail(describeError(error, "Không duyệt được hồ sơ."));
  }

  revalidateIdentity();
  return ok("Đã duyệt. Số CCCD đã được ghi vào hồ sơ người thuê.");
}

export async function rejectIdDocument(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const parsed = rejectIdDocumentSchema.safeParse({
    documentId: formData.get("documentId") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.rejectIdDocument(parsed.data.documentId, parsed.data.note);
  } catch (error) {
    return fail(describeError(error, "Không từ chối được hồ sơ."));
  }

  revalidateIdentity();
  return ok("Đã từ chối. Người thuê sẽ thấy lý do và gửi lại được.");
}

/** Chủ trọ xoá hẳn hồ sơ (kể cả đã duyệt) — kèm ảnh trong bucket riêng tư. */
export async function deleteIdDocument(formData: FormData): Promise<void> {
  await requireAdmin();

  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return;

  await db.deleteIdDocument(documentId);
  revalidateIdentity();
}
