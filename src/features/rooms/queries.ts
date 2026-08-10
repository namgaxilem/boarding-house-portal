import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";

/**
 * Danh sách phòng cho khu quản trị.
 *
 * Trang /admin/rooms tách phần đếm số phòng (ở header) và bảng phòng thành hai
 * <Suspense> khác nhau để shell hiện ngay khi điều hướng; `cache()` giữ cho hai
 * chỗ đó chỉ tốn một truy vấn.
 */
export const listRooms = cache(async () => db.listRooms());
