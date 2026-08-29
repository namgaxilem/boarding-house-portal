import Image from "next/image";
import { QrCodeIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/common/copy-button";
import { listPaymentAccountsForDisplay } from "@/features/payments/queries";
import { formatVND } from "@/lib/format";
import type { PaymentAccount } from "@/types";

/**
 * Cách chuyển tiền, hiện cho người thuê.
 *
 * Số tiền và nội dung chuyển khoản nằm ở TRÊN CÙNG, trước mọi số tài khoản: đó
 * là hai thứ người thuê phải gõ đúng, còn số tài khoản thì bấm sao chép hoặc quét
 * QR là xong.
 */
export async function PaymentMethods({
  amount,
  transferNote,
  title = "Chuyển khoản",
  footer,
}: {
  /** Bỏ trống ở những trang không gắn với một hoá đơn cụ thể (trang liên hệ). */
  amount?: number;
  transferNote?: string;
  title?: string;
  footer?: React.ReactNode;
}) {
  const accounts = await listPaymentAccountsForDisplay();
  if (accounts.length === 0) return null;

  return (
    <Card>
      <CardContent className="space-y-4 p-5 text-sm">
        <p className="font-semibold">{title}</p>

        {(amount !== undefined || transferNote) && (
          <dl className="space-y-2 rounded-lg bg-secondary/60 p-3">
            {amount !== undefined && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Số tiền</dt>
                <dd className="flex items-center gap-1 font-semibold tabular-nums">
                  {formatVND(amount)}
                  {/* Sao chép ra SỐ TRẦN, không có dấu chấm và không có "₫" —
                      ô nhập số tiền của app ngân hàng không nhận ký tự nào khác. */}
                  <CopyButton value={String(amount)} label="Sao chép số tiền" />
                </dd>
              </div>
            )}

            {transferNote && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Nội dung</dt>
                <dd className="flex items-center gap-1 font-mono">
                  {transferNote}
                  <CopyButton value={transferNote} label="Sao chép nội dung chuyển khoản" />
                </dd>
              </div>
            )}
          </dl>
        )}

        <ul className="space-y-3">
          {accounts.map((account) => (
            <li key={account.id}>
              <AccountBlock account={account} />
            </li>
          ))}
        </ul>

        {footer}
      </CardContent>
    </Card>
  );
}

function AccountBlock({ account }: { account: PaymentAccount }) {
  if (account.kind === "qr") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-3">
        <p className="flex items-center gap-1.5 self-start font-medium">
          <QrCodeIcon className="size-4 text-muted-foreground" />
          {account.label}
        </p>

        {account.qrUrl && (
          <div className="relative aspect-square w-full max-w-[220px] overflow-hidden rounded-md bg-white">
            {/* Nền trắng cố định: chế độ tối làm ảnh QR nền trong suốt thành đen
                trên đen, và điện thoại không quét nổi. */}
            <Image
              src={account.qrUrl}
              alt={`Mã QR ${account.label}`}
              fill
              sizes="220px"
              className="object-contain p-2"
            />
          </div>
        )}

        {account.note && (
          <p className="self-start text-xs text-muted-foreground">{account.note}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="font-medium">{account.label}</p>

      <dl className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Ngân hàng</dt>
          <dd className="text-right">{account.bankName}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Số tài khoản</dt>
          <dd className="flex items-center gap-1 font-mono tabular-nums">
            {account.accountNumber}
            <CopyButton value={account.accountNumber ?? ""} label="Sao chép số tài khoản" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Chủ tài khoản</dt>
          <dd className="text-right">{account.accountHolder}</dd>
        </div>
      </dl>

      {account.note && <p className="text-xs text-muted-foreground">{account.note}</p>}
    </div>
  );
}
