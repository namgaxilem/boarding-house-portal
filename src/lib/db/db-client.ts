import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { createClient as createCookieClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Chọn client cho tầng adapter: gắn cookie (đường web) hay service-role (bot).
 *
 * ---------------------------------------------------------------------------
 *  VẤN ĐỀ
 * ---------------------------------------------------------------------------
 * Bot Telegram và endpoint MCP không có cookie. `createClient()` của
 * `lib/supabase/server.ts` vẫn dựng được, nhưng không có phiên `sb-*` nên
 * `auth.uid()` là null, `public.is_admin()` là false, và MỌI policy từ chối.
 *
 * Kiểu hỏng ở đây là kiểu nguy hiểm nhất: `db.listRooms()` trả về `[]` và
 * KHÔNG báo lỗi gì. Một bot trả lời "nhà trọ không có phòng nào" nghe như một
 * câu trả lời, không nghe như một lỗi phân quyền.
 *
 * ---------------------------------------------------------------------------
 *  CÁCH CHỌN, VÀ BA CÁCH ĐÃ LOẠI
 * ---------------------------------------------------------------------------
 * Chọn: chạy đường bot bằng **service-role**, và chuyển việc phân quyền lên
 * tầng `lib/mcp/` (allowlist tool đóng + mọi lời gọi ghi vào `admin_audit_log`).
 *
 * Repo đã làm đúng thế này rồi, và `repository.ts` nói ra miệng ở
 * `listOverdueInvoices`: *"Chạy bằng service-role key: người gọi duy nhất là job
 * cron nhắc hạn, lúc đó không có ai đăng nhập nên RLS sẽ trả về 0 dòng nếu dùng
 * client thường."* Bot là đúng tình huống đó với bề mặt rộng hơn.
 *
 * Đã loại — "mint một phiên Supabase thật cho admin đã liên kết": không có mật
 * khẩu của họ, nên phải đổi magic link rồi CẤT REFRESH TOKEN theo từng chat. Rò
 * cái đó ra thì hoạt động sinh ra trông y như một lần đăng nhập hợp lệ, khó phát
 * hiện hơn hẳn rò service key. Và nó gần như không mua được gì: `is_admin()` mở
 * gần hết mọi bảng, khoảng cách giữa hai lựa chọn đúng bằng MỘT bảng
 * (`integration_tokens`) mà không tool nào chạm tới.
 *
 * Đã loại — "một vai Postgres riêng": mạnh nhất về lý thuyết, nhưng Supabase xác
 * thực vai qua claim `role` trong JWT, nên phải tự ký JWT và tự lo xoay khoá.
 *
 * Đã loại — "thêm 18 method service-role vào `Repository`": nhân đôi interface.
 *
 * ---------------------------------------------------------------------------
 *  VÌ SAO LÀ AsyncLocalStorage
 * ---------------------------------------------------------------------------
 * Helper bên trong adapter tự gọi `await createClient()` (ví dụ
 * `loadRoomsWithOccupancy`), nên không truyền client vào từ ngoài được. Luồn
 * thêm một tham số qua ~40 helper và 122 method là một diff khổng lồ.
 *
 * `AsyncLocalStorage` là thứ ngầm, mà repo này chuộng tường minh — đánh đổi có
 * thật. Bù lại: nó là Node core, giữ nguyên qua `await`, chạy trong `after()`
 * (cùng tiến trình), và `runAsService` là LỐI VÀO DUY NHẤT. Ràng buộc bằng cấu
 * trúc chứ không bằng kỷ luật: quên gọi thì không có cách nào lỡ tay bật nó.
 *
 * ⚠️ `runAsService` chỉ được gọi từ `src/lib/mcp/run.ts`. Đường web tuyệt đối
 * không dùng — ở đó cookie của người dùng LÀ thứ phân quyền.
 */

type Mode = "service";

const store = new AsyncLocalStorage<Mode>();

/** Chạy `fn` với tầng dữ liệu ở chế độ service-role. Lối vào duy nhất. */
export function runAsService<T>(fn: () => Promise<T>): Promise<T> {
  return store.run("service", fn);
}

/** `true` khi đang ở trong `runAsService`. Dùng cho assert, không để rẽ nhánh nghiệp vụ. */
export function isServiceContext(): boolean {
  return store.getStore() === "service";
}

/**
 * Thay thế cho `createClient` của `lib/supabase/server`.
 *
 * `supabase-adapter.ts` import hàm này thay vì bản gốc, nên cả 91 lời gọi
 * `await createClient()` bên trong nó không phải sửa một dòng nào.
 *
 * Kiểu trả về khai theo bản cookie: `createServerClient` của `@supabase/ssr` và
 * `createClient` của `supabase-js` sinh ra client giống nhau về cấu trúc —
 * adapter đã dựa vào đúng điều đó ở chỗ khai `StorageClient`. Không `any`,
 * không cast.
 */
export async function createClient(): Promise<
  Awaited<ReturnType<typeof createCookieClient>>
> {
  if (store.getStore() === "service") {
    return createAdminClient();
  }
  return createCookieClient();
}
