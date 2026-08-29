import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/dal";
import { db, type MaintenanceFilter } from "@/lib/db";

export const listMaintenanceRequests = cache(async (filter: MaintenanceFilter = {}) =>
  db.listMaintenanceRequests(filter),
);

/** Hàng chờ thật sự của chủ trọ: phiếu chưa xong. */
export const listActiveMaintenanceRequests = cache(async () =>
  db.listMaintenanceRequests({ status: "active" }),
);

/**
 * Phiếu người đang đăng nhập nhìn thấy.
 *
 * Không truyền id để lọc — RLS đã quyết định (phòng đang ở + phiếu tự gửi). Ở
 * đây chỉ cần `requireUser()` để chắc chắn có phiên đăng nhập trước khi hỏi.
 */
export const listMyMaintenanceRequests = cache(async () => {
  const user = await requireUser();
  return db.listMaintenanceRequestsForUser(user.id);
});

export const getMaintenanceRequest = cache(async (id: string) =>
  db.getMaintenanceRequest(id),
);
