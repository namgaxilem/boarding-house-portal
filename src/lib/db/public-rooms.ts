import "server-only";

import { cache } from "react";

import { db } from "./index";
import { houseConfig } from "@/config/site";

/**
 * Danh sách phòng trống dùng cho các trang công khai (`/` và `/rooms`).
 *
 * Mỗi trang chia dữ liệu này ra nhiều <Suspense> khác nhau (số phòng ở hero, danh
 * sách phòng ở dưới) để phần tĩnh vẫn prerender được — nghĩa là cùng một truy vấn
 * bị gọi vài lần trong một lần render. `cache()` gộp chúng lại thành một query.
 */
export const listVacantRooms = cache(async () =>
  houseConfig.features.publicRoomList ? db.listVacantRooms() : [],
);
