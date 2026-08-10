import "server-only";

import { cache } from "react";

import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { TenancyDetail } from "@/types";

/**
 * The signed-in tenant's active tenancy, or null if they have not been assigned
 * a room yet. Memoized per render so the layout and page share one lookup.
 */
export const getMyTenancy = cache(async (): Promise<TenancyDetail | null> => {
  const user = await requireUser();
  return db.getActiveTenancyForTenant(user.id);
});

/**
 * Danh sách người thuê cho khu quản trị. Trang /admin/tenants đếm số người ở
 * header và dựng bảng ở dưới trong hai <Suspense> riêng — `cache()` gộp lại thành
 * một truy vấn.
 */
export const listTenants = cache(async () => db.listTenants());

export const getMyWifi = cache(async () => {
  const tenancy = await getMyTenancy();
  if (!tenancy) return [];
  return db.getWifiForRoom(tenancy.roomId);
});
