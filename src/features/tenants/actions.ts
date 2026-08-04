"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin, requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  describeError,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";

import { createTenantSchema, ownProfileSchema, tenantSchema } from "./schema";

function readTenantForm(formData: FormData) {
  return {
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? undefined,
    dateOfBirth: formData.get("dateOfBirth") ?? undefined,
    hometown: formData.get("hometown") ?? undefined,
    note: formData.get("note") ?? undefined,
  };
}

export async function createTenant(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireAdmin();

  const parsed = createTenantSchema.safeParse({
    ...readTenantForm(formData),
    password: formData.get("password"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const { password, ...input } = parsed.data;

  let tenantId: string;
  try {
    const profile = await db.createTenant(input, password);
    tenantId = profile.id;
  } catch (error) {
    return fail(describeError(error, "Không tạo được tài khoản người thuê."));
  }

  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
  redirect(`/admin/tenants/${tenantId}?created=1`);
}

export async function updateTenant(
  tenantId: string,
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string> | null> {
  await requireAdmin();

  const parsed = tenantSchema.safeParse(readTenantForm(formData));
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.updateTenant(tenantId, parsed.data);
  } catch (error) {
    return fail(describeError(error, "Không cập nhật được hồ sơ."));
  }

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenantId}`);
  redirect(`/admin/tenants/${tenantId}`);
}

export async function toggleTenantActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const tenantId = String(formData.get("tenantId") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!tenantId) return;

  await db.setTenantActive(tenantId, isActive);

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenantId}`);
}

export async function deleteTenant(formData: FormData): Promise<void> {
  await requireAdmin();

  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) return;

  try {
    await db.deleteTenant(tenantId);
  } catch (error) {
    redirect(
      `/admin/tenants/${tenantId}?error=${encodeURIComponent(
        describeError(error, "Không xoá được người thuê."),
      )}`,
    );
  }

  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
  redirect("/admin/tenants?deleted=1");
}

/** Admin sets a new temporary password for a tenant who has been locked out. */
export async function resetTenantPassword(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const tenantId = String(formData.get("tenantId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!tenantId) return fail("Thiếu thông tin người thuê.");
  if (password.length < 6) {
    return invalid({
      issues: [{ path: ["password"], message: "Mật khẩu cần ít nhất 6 ký tự" }],
    });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(tenantId, { password });
  if (error) return fail("Không đặt lại được mật khẩu. Thử lại.");

  return ok("Đã đặt mật khẩu mới. Nhớ đưa lại cho người thuê và nhắc họ đổi.");
}

/** A tenant editing their own details. Email and note stay admin-only. */
export async function updateOwnProfile(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const user = await requireUser();

  const parsed = ownProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? undefined,
    dateOfBirth: formData.get("dateOfBirth") ?? undefined,
    hometown: formData.get("hometown") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.updateOwnProfile(user.id, parsed.data);
  } catch (error) {
    return fail(describeError(error, "Không lưu được thông tin."));
  }

  revalidatePath("/me/profile");
  revalidatePath("/me");
  return ok("Đã lưu thông tin.");
}
