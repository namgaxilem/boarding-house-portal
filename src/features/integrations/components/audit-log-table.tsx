import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ScrollTextIcon } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/types";

const OUTCOME_LABEL: Record<AuditLogEntry["outcome"], string> = {
  pending: "Đang chạy",
  ok: "Xong",
  error: "Lỗi",
  denied: "Từ chối",
};

const OUTCOME_STYLE: Record<AuditLogEntry["outcome"], string> = {
  pending: "bg-secondary text-muted-foreground border-border",
  ok: "bg-success/12 text-success border-success/25",
  error: "bg-destructive/10 text-destructive border-destructive/25",
  denied: "bg-warning/15 text-warning-foreground border-warning/30 dark:text-warning",
};

/**
 * Nhật ký thao tác của trợ lý.
 *
 * `docs/11` mục 4 ghi "Không có nhật ký thao tác của admin" là một khoảng trống
 * đã biết. Bảng này lấp nó cho đường đi của bot — và với đường đó thì nó BẮT
 * BUỘC phải có, vì bot chạy bằng service-role nên RLS không còn ghi lại gì thay
 * ta nữa.
 *
 * Ghi cả lần ĐỌC. Khi dữ liệu dính tới người ở trọ thì "ai đã hỏi gì về ai" đúng
 * là câu mà một nhật ký sinh ra để trả lời.
 */
export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nhật ký trợ lý</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {entries.length === 0 ? (
          <EmptyState
            icon={<ScrollTextIcon />}
            title="Chưa có thao tác nào"
            description="Mỗi lần trợ lý đọc dữ liệu sẽ để lại một dòng ở đây, kèm ai hỏi và hỏi gì."
          />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <Badge variant="outline" className={cn(OUTCOME_STYLE[entry.outcome])}>
                  {OUTCOME_LABEL[entry.outcome]}
                </Badge>
                <code className="font-mono text-xs">{entry.toolName}</code>
                {!entry.readOnly && (
                  <Badge variant="outline" className={OUTCOME_STYLE.denied}>
                    ghi
                  </Badge>
                )}
                <span className="text-muted-foreground">{entry.actorEmail}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(entry.occurredAt)}
                  {entry.durationMs !== null ? ` · ${entry.durationMs}ms` : ""}
                </span>
                {entry.errorCode && (
                  <span className="w-full text-xs text-destructive">{entry.errorCode}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
