"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { describeError, fail, ok, type ActionResult } from "@/lib/action-result";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Trình duyệt đã resize trước khi gửi; đây là chốt chặn phía server. */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PER_UPLOAD = 10;

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
  if (files.length > MAX_PER_UPLOAD) {
    return fail(`Mỗi lần tải tối đa ${MAX_PER_UPLOAD} ảnh.`);
  }

  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return fail(`"${file.name}" không phải ảnh JPG/PNG/WebP.`);
    }
    if (file.size > MAX_BYTES) {
      return fail(`"${file.name}" vẫn quá nặng sau khi nén. Thử ảnh khác.`);
    }
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
