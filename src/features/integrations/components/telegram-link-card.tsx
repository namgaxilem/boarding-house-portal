"use client";

import { useActionState } from "react";
import { LinkIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmForm } from "@/components/common/confirm-form";
import { CopyButton } from "@/components/common/copy-button";
import { SubmitButton } from "@/components/common/form";
import { formatDateTime } from "@/lib/format";
import type { TelegramLink } from "@/types";

import { createLinkCode, revokeLink } from "../actions";

/**
 * Sinh mã liên kết và quản lý những máy đã gắn.
 *
 * Mã hiện đúng MỘT LẦN. Không có nút "xem lại" vì database chỉ giữ băm — và đó
 * là điều làm cho bảng mã rò ra cũng không liên kết được gì.
 */
export function TelegramLinkCard({
  links,
  botUsername,
  configured,
}: {
  links: TelegramLink[];
  botUsername: string;
  configured: boolean;
}) {
  const [state, formAction] = useActionState(createLinkCode, null);

  const code = state?.ok ? state.data : null;
  const active = links.filter((link) => !link.revokedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liên kết Telegram</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {!configured && (
          <Alert>
            <AlertDescription>
              Chưa điền <code>TELEGRAM_BOT_TOKEN</code> và <code>TELEGRAM_WEBHOOK_SECRET</code>.
              Tạo mã vẫn được, nhưng bot chưa nhận tin nhắn cho tới khi điền xong và chạy{" "}
              <code>npm run telegram:webhook</code>.
            </AlertDescription>
          </Alert>
        )}

        {state && !state.ok && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {code ? (
          <Alert variant="success" role="status">
            <AlertDescription className="space-y-3">
              <p>
                Mã của bạn — <strong>hiện đúng một lần</strong>, sống 10 phút:
              </p>
              <p className="flex items-center gap-2">
                <code className="rounded bg-background px-2 py-1 font-mono text-lg tracking-widest">
                  {code}
                </code>
                <CopyButton value={code} label="Chép mã" />
              </p>
              {botUsername ? (
                <p>
                  Bấm{" "}
                  <a
                    href={`https://t.me/${botUsername}?start=${code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    mở bot và liên kết ngay
                  </a>
                  , hoặc gõ <code>/start {code}</code> cho bot.
                </p>
              ) : (
                <p>
                  Gõ cho bot: <code>/start {code}</code>
                </p>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <form action={formAction}>
            <SubmitButton pendingText="Đang tạo…">
              <LinkIcon />
              Tạo mã liên kết
            </SubmitButton>
          </form>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Máy đã liên kết</h3>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có máy nào.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {active.map((link) => (
                <li
                  key={link.chatId}
                  className="flex flex-wrap items-center justify-between gap-2 p-3"
                >
                  <div className="text-sm">
                    <p className="font-medium">
                      {link.telegramUsername ? `@${link.telegramUsername}` : `Chat ${link.chatId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Liên kết {formatDateTime(link.linkedAt)}
                      {link.lastSeenAt ? ` · nhắn gần nhất ${formatDateTime(link.lastSeenAt)}` : ""}
                    </p>
                  </div>

                  <ConfirmForm
                    action={revokeLink}
                    hidden={{ chatId: String(link.chatId) }}
                    title="Thu hồi liên kết này?"
                    description="Máy đó không hỏi được gì nữa cho tới khi liên kết lại bằng mã mới. Nhật ký cũ vẫn giữ nguyên."
                    confirmLabel="Thu hồi"
                    triggerLabel={
                      <>
                        <Trash2Icon />
                        Thu hồi
                      </>
                    }
                    triggerProps={{
                      variant: "ghost",
                      size: "sm",
                      className: "text-destructive hover:bg-destructive/10",
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button variant="ghost" size="sm" asChild>
          <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
            Tạo bot mới ở @BotFather
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
