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

import { bankAccountSchema, qrAccountSchema } from "./schema";

/**
 * Số tài khoản và ảnh QR chủ trọ tự thêm.
 *
 * Trước đây thông tin chuyển khoản nằm cứng trong `src/config/site.ts` và đổi
 * được thì phải deploy lại. Đó là lựa chọn đúng cho tên nhà trọ và nội quy —
 * chúng gần như không đổi — nhưng sai cho tài khoản nhận tiền: chủ trọ đổi ngân
 * hàng, thêm QR MoMo, hoặc tạm tắt một tài khoản, và không ai trong số đó nên
 * cần tới một lần build.
 */

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Ảnh QR chụp màn hình điện thoại luôn nhỏ hơn nhiều; đây là chốt chặn cuối. */
const MAX_QR_BYTES = 2 * 1024 * 1024;

/**
 * Cách nhận tiền hiện trên MỌI hoá đơn của MỌI người thuê, nên không có đường
 * nào liệt kê hết các trang bị ảnh hưởng. Quét cả hai nhánh là cách duy nhất
 * không bỏ sót một trang chi tiết hoá đơn nào.
 */
function revalidatePayments() {
  revalidatePath("/admin/settings/payments");
  revalidatePath("/admin", "layout");
  revalidatePath("/me", "layout");
}

export async function savePaymentAccount(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  await requireAdmin();

  const accountId = String(formData.get("accountId") ?? "");
  const kind = formData.get("kind") === "qr" ? "qr" : "bank";

  const common = {
    label: formData.get("label"),
    note: formData.get("note") ?? undefined,
    isActive: formData.get("isActive") ?? undefined,
  };

  if (kind === "qr") {
    const parsed = qrAccountSchema.safeParse(common);
    if (!parsed.success) return invalid(parsed.error);

    try {
      if (accountId) {
        // Ảnh QR KHÔNG thay được tại chỗ — xem `updatePaymentAccount`. Đổi ảnh
        // thì xoá thẻ cũ rồi thêm thẻ mới, để không bao giờ có cảnh nhãn ghi một
        // ngân hàng còn ảnh quét ra tài khoản khác.
        await db.updatePaymentAccount(accountId, {
          ...parsed.data,
          bankName: null,
          accountNumber: null,
          accountHolder: null,
        });
      } else {
        const file = formData.get("qr");
        if (!(file instanceof File) || file.size === 0) {
          return fail(describeError("PAYMENT_QR_REQUIRED", "Chọn ảnh QR để tải lên."));
        }
        if (!ACCEPTED_TYPES.includes(file.type)) {
          return fail("Ảnh QR phải là JPG, PNG hoặc WebP.");
        }
        if (file.size > MAX_QR_BYTES) {
          return fail("Ảnh QR vượt quá 2MB. Chụp lại màn hình thay vì chụp ảnh giấy.");
        }

        await db.createQrAccount(parsed.data, file);
      }
    } catch (error) {
      return fail(describeError(error, "Không lưu được ảnh QR."));
    }

    revalidatePayments();
    return ok(accountId ? "Đã cập nhật thẻ QR." : "Đã thêm ảnh QR.");
  }

  const parsed = bankAccountSchema.safeParse({
    ...common,
    bankName: formData.get("bankName"),
    accountNumber: formData.get("accountNumber"),
    accountHolder: formData.get("accountHolder"),
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    if (accountId) {
      await db.updatePaymentAccount(accountId, parsed.data);
    } else {
      await db.createBankAccount(parsed.data);
    }
  } catch (error) {
    return fail(describeError(error, "Không lưu được số tài khoản."));
  }

  revalidatePayments();
  return ok(accountId ? "Đã cập nhật số tài khoản." : "Đã thêm số tài khoản.");
}

export async function deletePaymentAccount(formData: FormData): Promise<void> {
  await requireAdmin();

  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return;

  await db.deletePaymentAccount(accountId);
  revalidatePayments();
}

export async function movePaymentAccount(formData: FormData): Promise<void> {
  await requireAdmin();

  const accountId = String(formData.get("accountId") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!accountId) return;

  await db.movePaymentAccount(accountId, direction);
  revalidatePayments();
}

/**
 * Bật/tắt nhanh, không mở form.
 *
 * Tắt chứ không xoá là thao tác đúng khi đổi ngân hàng: thẻ cũ biến mất khỏi hoá
 * đơn ngay, nhưng số tài khoản vẫn còn đó để đối chiếu những lần chuyển đã nhận.
 */
export async function togglePaymentAccount(formData: FormData): Promise<void> {
  await requireAdmin();

  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return;

  const current = await db.getPaymentAccount(accountId);
  if (!current) return;

  await db.updatePaymentAccount(accountId, {
    label: current.label,
    bankName: current.bankName,
    accountNumber: current.accountNumber,
    accountHolder: current.accountHolder,
    note: current.note,
    isActive: !current.isActive,
  });

  revalidatePayments();
}
