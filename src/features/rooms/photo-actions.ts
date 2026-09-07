"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { describeError, fail, ok, type ActionResult } from "@/lib/action-result";
import { ROOM_PHOTO_POLICY as POLICY, checkUploadFile } from "@/lib/upload-policy";

function revalidateRoom(roomId: string) {
  revalidatePath(`/admin/rooms/${roomId}`);
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  revalidatePath("/");
  revalidatePath("/me/room");
}

export async function uploadRoomPhotos(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const roomId = String(formData.get("roomId") ?? "");
  if (!roomId) return fail("Thiếu thông tin phòng.");

  const files = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) return fail("Chưa chọn ảnh nào.");
  if (files.length > POLICY.maxPerUpload) {
    return fail(`Mỗi lần tải tối đa ${POLICY.maxPerUpload} ảnh.`);
  }

  for (const file of files) {
    const problem = checkUploadFile(file, POLICY);
    if (problem) return fail(problem);
  }

  // Trần TỔNG, không phải trần mỗi lượt.
  //
  // Trước đây chỉ có trần 10 ảnh mỗi lần gửi — bấm "Thêm ảnh" mười lần là có
  // trăm tấm trong một phòng, và không có gì chặn. Trên gói 1GB miễn phí thì
  // một phòng như vậy ăn hết phần của cả chục phòng khác.
  const already = await db.countRoomPhotos(roomId);
  if (already + files.length > POLICY.maxPerParent) {
    return fail(
      `Phòng này đã có ${already} ảnh, tối đa ${POLICY.maxPerParent}. Xoá bớt trước khi thêm.`,
    );
  }

  // Tải tuần tự chứ không song song: `sort_order` được tính từ ảnh cuối hiện
  // có, chạy song song sẽ đọc cùng một giá trị và trùng thứ tự.
  let uploaded = 0;
  for (const file of files) {
    try {
      await db.addRoomPhoto(roomId, file);
      uploaded += 1;
    } catch (error) {
      revalidateRoom(roomId);
      const detail = describeError(error, "Không tải được ảnh lên.");
      return fail(
        uploaded > 0 ? `Đã tải ${uploaded} ảnh, rồi dừng lại: ${detail}` : detail,
      );
    }
  }

  revalidateRoom(roomId);
  return ok(`Đã tải lên ${uploaded} ảnh.`);
}

export async function deleteRoomPhoto(formData: FormData): Promise<void> {
  await requireAdmin();

  const photoId = String(formData.get("photoId") ?? "");
  const roomId = String(formData.get("roomId") ?? "");
  if (!photoId) return;

  await db.deleteRoomPhoto(photoId);
  revalidateRoom(roomId);
}

export async function setCoverPhoto(formData: FormData): Promise<void> {
  await requireAdmin();

  const photoId = String(formData.get("photoId") ?? "");
  const roomId = String(formData.get("roomId") ?? "");
  if (!photoId) return;

  await db.setRoomCoverPhoto(photoId);
  revalidateRoom(roomId);
}

export async function moveRoomPhoto(formData: FormData): Promise<void> {
  await requireAdmin();

  const photoId = String(formData.get("photoId") ?? "");
  const roomId = String(formData.get("roomId") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!photoId) return;

  await db.moveRoomPhoto(photoId, direction);
  revalidateRoom(roomId);
}
