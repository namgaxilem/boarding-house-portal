import "server-only";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/dal";

/**
 * Đọc dữ liệu cho khu vực cổng. Chỉ chủ trọ.
 *
 * `requireAdmin()` ở đây là lớp thứ hai, không phải lớp duy nhất: RLS trên
 * `gate_locks` / `gate_credentials` mới là thứ chặn thật. Nhưng gọi ở đây thì
 * người thuê gõ tay /admin/gate nhận được chuyển hướng, không phải một trang
 * trống trông như lỗi.
 */
export async function getGateOverview() {
  await requireAdmin();
  const [locks, toRevoke] = await Promise.all([
    db.listGateLocks(),
    db.listGateCredentialsToRevoke(),
  ]);
  return {
    locks,
    toRevoke,
    primaryLock: locks.find((lock) => lock.isPrimary) ?? null,
  };
}
