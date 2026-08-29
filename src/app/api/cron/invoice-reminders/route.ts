import { NextResponse, type NextRequest } from "next/server";

import { authorizeCron } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { todayInHouseTz } from "@/lib/format";
import { notifyInvoiceDue } from "@/lib/notify";

/**
 * Nhắc những hoá đơn đã quá hạn mà chưa thu.
 *
 * Gọi mỗi ngày một lần từ GitHub Actions (xem .github/workflows/invoice-reminders.yml):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/invoice-reminders
 *
 * Mỗi hoá đơn chỉ nhắc MỘT LẦN: sau khi nhắc, một dòng `notifications` với
 * type='invoice_due' tồn tại và lần chạy sau bỏ qua hoá đơn đó. Không có cái chốt
 * này thì người thuê nhận đúng một email mỗi ngày cho tới khi họ đóng tiền, và
 * hộp thư của họ sẽ dạy họ cách lọc bỏ email của nhà trọ.
 */
export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  // Ngày theo giờ NHÀ TRỌ, không theo giờ máy chủ. `due_date` là cột `date`
  // thuần: so nó với ngày UTC thì mỗi tối 17:00–24:00 giờ Việt Nam, hoá đơn đến
  // hạn "hôm nay" đã bị coi là quá hạn sớm một ngày.
  const today = todayInHouseTz();
  const overdue = await db.listOverdueInvoices(today);

  let reminded = 0;
  let skipped = 0;

  for (const invoice of overdue) {
    if (await db.hasInvoiceDueReminder(invoice.id)) {
      skipped += 1;
      continue;
    }

    await notifyInvoiceDue(invoice);
    reminded += 1;
  }

  return NextResponse.json({ ok: true, overdue: overdue.length, reminded, skipped });
}
