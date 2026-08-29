"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

/**
 * Mở một thông báo: đánh dấu đã đọc rồi đi tới chỗ nó trỏ về.
 *
 * Làm bằng một Server Action thay vì một <Link> kèm onClick, để một cú chạm vừa
 * cập nhật database vừa điều hướng — và vẫn chạy khi JavaScript chưa kịp tải,
 * đúng lúc người ta mở app từ thông báo email trên mạng 3G.
 */
export async function openNotification(formData: FormData): Promise<void> {
  await requireUser();

  const notificationId = String(formData.get("notificationId") ?? "");
  const link = String(formData.get("link") ?? "");

  if (notificationId) {
    // RLS chỉ cho sửa dòng của chính mình, và GRANT ở tầng cột chỉ cho sửa
    // `read_at` — không cần kiểm chủ sở hữu ở đây nữa.
    await db.markNotificationRead(notificationId);
  }

  revalidatePath("/me/notifications");
  revalidatePath("/me");

  // Chỉ nhận đường dẫn nội bộ. `link` đi qua form nên về nguyên tắc sửa được từ
  // client; redirect tới một URL bên ngoài là một open redirect.
  redirect(link.startsWith("/") ? link : "/me/notifications");
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();

  await db.markAllNotificationsRead(user.id);

  revalidatePath("/me/notifications");
  revalidatePath("/me");
}
