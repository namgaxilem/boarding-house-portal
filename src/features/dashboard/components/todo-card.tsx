import {
  CheckCircle2Icon,
  ChevronRightIcon,
  ClockIcon,
  GaugeIcon,
  IdCardIcon,
  ReceiptTextIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { Link } from "@/components/common/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonthYear, formatVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminTodo } from "@/types";

interface TodoItem {
  href: string;
  icon: LucideIcon;
  label: string;
  detail: string;
  tone: "warning" | "info" | "destructive";
}

/**
 * "Cần xử lý" — danh sách việc tồn, không phải một bảng số liệu.
 *
 * Mỗi dòng ở đây là một việc có thể LÀM XONG, và mỗi dòng dẫn thẳng tới chỗ làm
 * nó. Thẻ biến mất hẳn khi không còn gì — một thẻ rỗng đứng đó hàng ngày sẽ được
 * mắt bỏ qua, rồi cái ngày nó có nội dung thật cũng bị bỏ qua nốt.
 */
export function TodoCard({ todo }: { todo: AdminTodo }) {
  const items: TodoItem[] = [];

  if (todo.urgentMaintenance > 0) {
    items.push({
      href: "/admin/maintenance",
      icon: WrenchIcon,
      label: `${todo.urgentMaintenance} báo hỏng KHẨN CẤP`,
      detail: "Người thuê đánh dấu nguy hiểm — gọi lại ngay.",
      tone: "destructive",
    });
  }

  // Trừ đi phần khẩn đã kể ở trên, để một phiếu không bị đếm hai lần.
  const normalMaintenance = todo.openMaintenance - todo.urgentMaintenance;
  if (normalMaintenance > 0) {
    items.push({
      href: "/admin/maintenance",
      icon: WrenchIcon,
      label: `${normalMaintenance} báo hỏng chờ xử lý`,
      detail: "Đổi trạng thái để người thuê biết bạn đã nhận.",
      tone: "warning",
    });
  }

  if (todo.overdueInvoices > 0) {
    items.push({
      href: "/admin/invoices?status=issued",
      icon: ClockIcon,
      label: `${todo.overdueInvoices} hoá đơn quá hạn`,
      detail: `${formatVND(todo.overdueAmount)} chưa thu được.`,
      tone: "warning",
    });
  }

  if (todo.pendingIdDocuments > 0) {
    items.push({
      href: "/admin/identity",
      icon: IdCardIcon,
      label: `${todo.pendingIdDocuments} hồ sơ giấy tờ chờ duyệt`,
      detail: "Duyệt xong thì số CCCD mới vào hồ sơ người thuê.",
      tone: "info",
    });
  }

  if (todo.roomsMissingReading.length > 0) {
    items.push({
      href: `/admin/meters?period=${todo.period}`,
      icon: GaugeIcon,
      label: `${todo.roomsMissingReading.length} phòng chưa ghi chỉ số tháng ${formatMonthYear(todo.period)}`,
      detail: todo.roomsMissingReading.join(", "),
      tone: "info",
    });
  }

  if (todo.draftInvoices > 0) {
    items.push({
      href: "/admin/invoices?status=draft",
      icon: ReceiptTextIcon,
      label: `${todo.draftInvoices} hoá đơn còn ở dạng nháp`,
      detail: "Người thuê chưa thấy gì cho tới khi bạn phát hành.",
      tone: "info",
    });
  }

  if (items.length === 0) {
    return (
      <Card className="border-success/25 bg-success/5">
        <CardContent className="flex items-center gap-3 p-4">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/12 text-success"
          >
            <CheckCircle2Icon className="size-5" />
          </span>
          <div>
            <p className="font-medium">Không còn việc tồn</p>
            <p className="text-sm text-muted-foreground">
              Chỉ số đã ghi đủ, hoá đơn không quá hạn, không có báo hỏng nào đang chờ.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cần xử lý</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-accent/40"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5",
                    item.tone === "destructive" && "bg-destructive/10 text-destructive",
                    item.tone === "warning" &&
                      "bg-warning/15 text-warning-foreground dark:text-warning",
                    item.tone === "info" && "bg-info/12 text-info",
                  )}
                >
                  <item.icon />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                </div>

                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
