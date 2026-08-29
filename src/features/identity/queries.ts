import "server-only";

import { db } from "@/lib/db";
import type { IdDocument } from "@/types";

/**
 * Đọc dữ liệu giấy tờ tuỳ thân.
 *
 * Mỏng có chủ đích: RLS ở migration 0006 mới là thứ quyết định ai đọc được gì.
 * Thêm bộ lọc quyền ở tầng này chỉ tạo cảm giác an toàn giả — Server Action gọi
 * thẳng `db` vẫn đi qua đúng policy đó.
 */

export function getLatestIdDocument(profileId: string) {
  return db.getLatestIdDocument(profileId);
}

export function listIdDocuments(profileId: string) {
  return db.listIdDocuments(profileId);
}

export function listPendingIdDocuments() {
  return db.listPendingIdDocuments();
}

/** Người thuê có đang chờ duyệt không — quyết định giao diện hiện gì. */
export function isPending(document: IdDocument | null) {
  return document?.status === "pending";
}
