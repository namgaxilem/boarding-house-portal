"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import {
  describeError,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";

import { roomEventSchema, roomSchema } from "./schema";

/**
 * Every action here follows the same order:
 *   authorize -> validate -> mutate -> revalidate -> return.
 *
 * A Server Action is a public POST endpoint. Skipping `requireAdmin()` would let
 * anyone who knows the action id create rooms, no UI needed.
 */

function readRoomForm(formData: FormData) {
  return {
    code: formData.get("code"),
    floor: formData.get("floor"),
    areaM2: formData.get("areaM2"),
    basePrice: formData.get("basePrice"),
    electricPrice: formData.get("electricPrice"),
    waterPrice: formData.get("waterPrice"),
    servicePrice: formData.get("servicePrice"),
    maxOccupants: formData.get("maxOccupants"),
    status: formData.get("status"),
    description: formData.get("description") ?? undefined,
  };
}

export async function createRoom(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireAdmin();

  const parsed = roomSchema.safeParse(readRoomForm(formData));
  if (!parsed.success) return invalid(parsed.error);

  let roomId: string;
  try {
    const room = await db.createRoom(parsed.data);
    roomId = room.id;
  } catch (error) {
    return fail(describeError(error, "Không tạo được phòng. Thử lại."));
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
  redirect(`/admin/rooms/${roomId}`);
}

export async function updateRoom(
  roomId: string,
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireAdmin();

  const parsed = roomSchema.safeParse(readRoomForm(formData));
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.updateRoom(roomId, parsed.data);
  } catch (error) {
    return fail(describeError(error, "Không cập nhật được phòng. Thử lại."));
  }

  revalidatePath("/admin/rooms");
  revalidatePath(`/admin/rooms/${roomId}`);
  revalidatePath("/admin");
  redirect(`/admin/rooms/${roomId}`);
}

export async function deleteRoom(formData: FormData): Promise<void> {
  await requireAdmin();

  const roomId = String(formData.get("roomId") ?? "");
  if (!roomId) return;

  try {
    await db.deleteRoom(roomId);
  } catch (error) {
    // Surfaced to the user as a query param — a thrown error here would replace
    // the whole page with an error boundary for what is a routine refusal.
    redirect(
      `/admin/rooms?error=${encodeURIComponent(describeError(error, "Không xoá được phòng."))}`,
    );
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/admin");
  redirect("/admin/rooms?deleted=1");
}

export async function createRoomEvent(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const parsed = roomEventSchema.safeParse({
    roomId: formData.get("roomId"),
    type: formData.get("type"),
    title: formData.get("title"),
    content: formData.get("content") ?? undefined,
    cost: formData.get("cost") ?? undefined,
    occurredAt: formData.get("occurredAt"),
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.createRoomEvent({
      ...parsed.data,
      occurredAt: new Date(parsed.data.occurredAt).toISOString(),
    });
  } catch (error) {
    return fail(describeError(error, "Không ghi được nhật ký."));
  }

  revalidatePath(`/admin/rooms/${parsed.data.roomId}`);
  revalidatePath("/admin");
  return ok("Đã thêm vào nhật ký phòng.");
}

export async function deleteRoomEvent(formData: FormData): Promise<void> {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const roomId = String(formData.get("roomId") ?? "");
  if (!eventId) return;

  await db.deleteRoomEvent(eventId);
  revalidatePath(`/admin/rooms/${roomId}`);
  revalidatePath("/admin");
}
