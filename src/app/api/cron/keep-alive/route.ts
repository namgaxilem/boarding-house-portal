import { NextResponse, type NextRequest } from "next/server";

import { authorizeCron } from "@/lib/cron-auth";
import { db } from "@/lib/db";

/**
 * Keeps a Supabase free-tier project from auto-pausing after 7 idle days.
 *
 * Call daily from GitHub Actions (see .github/workflows/keep-alive.yml):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/keep-alive
 *
 * Nó cũng là chỗ dọn bảng của trợ lý. Repo cố ý KHÔNG có bộ lập lịch trong tiến
 * trình (docs/09), nên việc dọn đi nhờ một cron vốn đã chạy hằng ngày thay vì
 * thêm một cái thứ hai: `telegram_updates` giữ 7 ngày, `admin_audit_log` giữ 90.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  // A trivial query is enough to count as activity.
  const rooms = await db.listVacantRooms();

  // Dọn hỏng không được làm hỏng việc ping — cái đó mới là lý do endpoint tồn tại.
  const swept = await db
    .sweepAssistantTables()
    .catch((error) => {
      console.error("[sweep] dọn bảng trợ lý thất bại", error);
      return { updates: 0, audit: 0 };
    });

  return NextResponse.json({ ok: true, vacantRooms: rooms.length, swept });
}
