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

import { wifiSchema } from "./schema";

function readWifiForm(formData: FormData) {
  return {
    ssid: formData.get("ssid"),
    password: formData.get("password"),
    scope: formData.get("scope"),
    roomId: formData.get("roomId") ?? undefined,
    floor: formData.get("floor") ?? undefined,
    note: formData.get("note") ?? undefined,
  };
}

function revalidateWifi() {
  revalidatePath("/admin/settings/wifi");
  revalidatePath("/me/wifi");
  revalidatePath("/me");
}

export async function saveWifi(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const parsed = wifiSchema.safeParse(readWifiForm(formData));
  if (!parsed.success) return invalid(parsed.error);

  const wifiId = String(formData.get("wifiId") ?? "");

  try {
    if (wifiId) {
      await db.updateWifi(wifiId, parsed.data);
    } else {
      await db.createWifi(parsed.data);
    }
  } catch (error) {
    return fail(describeError(error, "Không lưu được mạng wifi."));
  }

  revalidateWifi();
  return ok(wifiId ? "Đã cập nhật mạng wifi." : "Đã thêm mạng wifi.");
}

export async function deleteWifi(formData: FormData): Promise<void> {
  await requireAdmin();

  const wifiId = String(formData.get("wifiId") ?? "");
  if (!wifiId) return;

  await db.deleteWifi(wifiId);
  revalidateWifi();
}
