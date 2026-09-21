import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { AuditLogTable } from "@/features/integrations/components/audit-log-table";
import { TelegramLinkCard } from "@/features/integrations/components/telegram-link-card";
import { getAssistantOverview } from "@/features/integrations/queries";
import { READ_TOOLS } from "@/lib/mcp/registry";
import { env } from "@/lib/env";
import { houseConfig } from "@/config/site";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Trợ lý",
  description: "Liên kết Telegram, hạn mức và nhật ký thao tác của trợ lý.",
  path: "/admin/settings/integrations",
});

export const instant = false;

export default function AssistantSettingsPage() {
  if (!houseConfig.features.assistant) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trợ lý Telegram"
        description="Hỏi về nhà trọ bằng tin nhắn, không phải mở web. Chỉ chủ trọ dùng được."
      />

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <AssistantSettings />
      </Suspense>
    </div>
  );
}

async function AssistantSettings() {
  const overview = await getAssistantOverview();

  return (
    <div className="space-y-5">
      {!overview.agentConfigured && (
        <Alert>
          <AlertDescription>
            Chưa điền <code>ANTHROPIC_API_KEY</code>. Bot vẫn liên kết tài khoản và trả lời{" "}
            <code>/help</code> được, nhưng chưa trả lời câu hỏi tự do.
          </AlertDescription>
        </Alert>
      )}

      <TelegramLinkCard
        links={overview.links}
        botUsername={env.telegramBotUsername}
        configured={overview.telegramConfigured}
      />

      <Card>
        <CardHeader>
          <CardTitle>Trợ lý làm được gì</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4 text-sm">
          <p>
            <strong>{READ_TOOLS.length} nguồn dữ liệu, tất cả CHỈ ĐỌC.</strong> Trợ lý không sửa,
            không xoá, không lập hoá đơn — phiên bản này không có một lệnh ghi nào trong danh sách.
          </p>
          <p className="text-muted-foreground">
            Cố ý KHÔNG cho trợ lý đọc: ảnh và số CCCD, mã cổng, mật khẩu wifi. Một đoạn hội thoại
            với AI là một bản sao mới của dữ liệu đó, nằm trong log của nhà cung cấp và trong lịch
            sử chat trên một cái điện thoại có thể mất.
          </p>
          <p className="text-muted-foreground">
            Số điện thoại và CCCD của người thuê hiện ở dạng che bớt. Cần số đầy đủ thì mở trang
            quản trị.
          </p>

          <div className="rounded-lg border border-border p-3">
            <p className="font-medium">Hạn mức hôm nay</p>
            <p className="text-muted-foreground">
              Đã dùng {overview.budget.spentUsd.toFixed(3)} / {overview.budget.limitUsd.toFixed(2)}{" "}
              USD. Hết hạn mức thì bot báo và ngừng gọi AI tới hết ngày.
            </p>
          </div>
        </CardContent>
      </Card>

      <AuditLogTable entries={overview.audit} />
    </div>
  );
}
