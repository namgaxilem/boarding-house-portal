"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  BanknoteIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeOffIcon,
  ImagePlusIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  QrCodeIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmForm } from "@/components/common/confirm-form";
import { CopyButton } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/empty-state";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import {
  deletePaymentAccount,
  movePaymentAccount,
  savePaymentAccount,
  togglePaymentAccount,
} from "@/features/payments/actions";
import { formatBytes, resizeImage } from "@/lib/image";
import type { PaymentAccount } from "@/types";

/**
 * Quản lý cách nhận tiền.
 *
 * Thứ tự các thẻ ở đây chính là thứ tự người thuê thấy trên hoá đơn, nên nút lên
 * /xuống không phải trang trí: thẻ đầu tiên là thứ 90% người thuê sẽ dùng.
 */
export function PaymentManager({ accounts }: { accounts: PaymentAccount[] }) {
  const [editing, setEditing] = useState<PaymentAccount | "bank" | "qr" | null>(null);

  return (
    <div className="space-y-4">
      {editing === null ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing("bank")}>
            <PlusIcon />
            Thêm số tài khoản
          </Button>
          <Button variant="outline" onClick={() => setEditing("qr")}>
            <QrCodeIcon />
            Thêm ảnh QR
          </Button>
        </div>
      ) : (
        <PaymentForm
          account={typeof editing === "string" ? undefined : editing}
          kind={typeof editing === "string" ? editing : editing.kind}
          onDone={() => setEditing(null)}
        />
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon={<BanknoteIcon />}
          title="Chưa có cách nhận tiền nào"
          description="Thêm số tài khoản hoặc ảnh QR để người thuê quét thẳng từ hoá đơn, khỏi phải gõ tay."
        />
      ) : (
        <ul className="space-y-3">
          {accounts.map((account, index) => (
            <li key={account.id}>
              <AccountCard
                account={account}
                isFirst={index === 0}
                isLast={index === accounts.length - 1}
                onEdit={() => setEditing(account)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountCard({
  account,
  isFirst,
  isLast,
  onEdit,
}: {
  account: PaymentAccount;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  return (
    <Card className={account.isActive ? undefined : "opacity-60"}>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        {account.kind === "qr" && account.qrUrl && (
          <div className="relative size-32 shrink-0 self-center overflow-hidden rounded-lg border border-border bg-white sm:self-start">
            <Image
              src={account.qrUrl}
              alt={`Mã QR ${account.label}`}
              fill
              sizes="128px"
              className="object-contain p-1"
            />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-medium">{account.label}</p>
            <Badge variant="secondary">
              {account.kind === "qr" ? "Ảnh QR" : "Số tài khoản"}
            </Badge>
            {!account.isActive && (
              <Badge variant="outline" className="text-muted-foreground">
                <EyeOffIcon className="size-3" />
                Đang tắt
              </Badge>
            )}
          </div>

          {account.kind === "bank" && (
            <dl className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-3">
              <dt className="text-muted-foreground">Ngân hàng</dt>
              <dd>{account.bankName}</dd>

              <dt className="text-muted-foreground">Số tài khoản</dt>
              <dd className="flex items-center gap-1 font-mono tabular-nums">
                {account.accountNumber}
                <CopyButton
                  value={account.accountNumber ?? ""}
                  label="Sao chép số tài khoản"
                />
              </dd>

              <dt className="text-muted-foreground">Chủ tài khoản</dt>
              <dd>{account.accountHolder}</dd>
            </dl>
          )}

          {account.note && (
            <p className="text-sm text-muted-foreground">{account.note}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <MoveButton accountId={account.id} direction="up" disabled={isFirst} />
          <MoveButton accountId={account.id} direction="down" disabled={isLast} />

          <form action={togglePaymentAccount}>
            <input type="hidden" name="accountId" value={account.id} />
            <Button type="submit" variant="ghost" size="sm">
              {account.isActive ? "Tắt" : "Bật"}
            </Button>
          </form>

          <Button variant="ghost" size="sm" onClick={onEdit}>
            <PencilIcon />
            Sửa
          </Button>

          <ConfirmForm
            action={deletePaymentAccount}
            hidden={{ accountId: account.id }}
            title={`Xoá "${account.label}"?`}
            description={
              account.kind === "qr"
                ? "Ảnh QR bị xoá hẳn khỏi máy chủ. Nếu chỉ muốn ẩn tạm thì bấm Tắt."
                : "Số tài khoản biến mất khỏi mọi hoá đơn. Nếu chỉ muốn ẩn tạm thì bấm Tắt."
            }
            triggerLabel="Xoá"
            triggerProps={{
              variant: "ghost",
              size: "sm",
              className: "text-muted-foreground hover:text-destructive",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MoveButton({
  accountId,
  direction,
  disabled,
}: {
  accountId: string;
  direction: "up" | "down";
  disabled: boolean;
}) {
  return (
    <form action={movePaymentAccount}>
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="direction" value={direction} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-label={direction === "up" ? "Đưa lên trên" : "Đưa xuống dưới"}
      >
        {direction === "up" ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </Button>
    </form>
  );
}

/**
 * Ngưỡng nén ảnh QR.
 *
 * Ảnh chụp màn hình app ngân hàng luôn dưới mức này và được giữ NGUYÊN BẢN — mã
 * QR là ảnh nét cạnh, nén lại chỉ có hại. Chỉ ảnh chụp bằng camera (một tờ QR
 * dán ở quầy) mới vượt ngưỡng, và ảnh đó thì cần thu nhỏ thật.
 */
const QR_RESIZE_THRESHOLD = 1024 * 1024;

function PaymentForm({
  account,
  kind,
  onDone,
}: {
  account?: PaymentAccount;
  kind: PaymentAccount["kind"];
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(savePaymentAccount, null);
  const errors = fieldErrorsOf(state);
  const [isActive, setIsActive] = useState(account?.isActive ?? true);
  const closed = useRef(false);

  useEffect(() => {
    if (state?.ok && !closed.current) {
      closed.current = true;
      onDone();
    }
  }, [state, onDone]);

  const isNewQr = kind === "qr" && !account;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4"
    >
      {account && <input type="hidden" name="accountId" value={account.id} />}
      <input type="hidden" name="kind" value={kind} />

      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="label"
          label="Tên hiển thị"
          required
          errors={errors}
          hint="Người thuê thấy tên này trên hoá đơn."
        >
          <Input
            defaultValue={account?.label}
            placeholder={kind === "qr" ? "QR MoMo chủ trọ" : "Vietcombank chủ trọ"}
            required
          />
        </Field>

        {kind === "bank" && (
          <>
            <Field name="bankName" label="Ngân hàng" required errors={errors}>
              <Input defaultValue={account?.bankName ?? ""} placeholder="Vietcombank" required />
            </Field>

            <Field name="accountNumber" label="Số tài khoản" required errors={errors}>
              <Input
                defaultValue={account?.accountNumber ?? ""}
                inputMode="numeric"
                placeholder="0011001234567"
                required
              />
            </Field>

            <Field
              name="accountHolder"
              label="Chủ tài khoản"
              required
              errors={errors}
              hint="Gõ đúng như ngân hàng hiển thị, thường là chữ HOA không dấu."
            >
              <Input
                defaultValue={account?.accountHolder ?? ""}
                placeholder="NGUYEN VAN TAM"
                required
              />
            </Field>
          </>
        )}

        {isNewQr && <QrPicker errors={errors} />}

        {kind === "qr" && account && (
          <div className="space-y-2 sm:col-span-2">
            <Label>Ảnh QR</Label>
            <p className="text-xs text-muted-foreground">
              Ảnh không đổi được tại chỗ. Muốn ảnh khác thì xoá thẻ này rồi thêm thẻ
              mới — như vậy không bao giờ có cảnh nhãn ghi một ngân hàng còn ảnh quét
              ra tài khoản khác.
            </p>
          </div>
        )}

        <Field
          name="note"
          label="Ghi chú"
          errors={errors}
          className="sm:col-span-2"
          hint="Hiện ngay dưới thẻ, ví dụ “quét bằng app ngân hàng, tự điền số tiền”."
        >
          <Input defaultValue={account?.note ?? ""} />
        </Field>

        <div className="flex items-start gap-3 sm:col-span-2">
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
          <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
          <div className="space-y-0.5">
            <Label htmlFor="isActive">Đang dùng</Label>
            <p className="text-xs text-muted-foreground">
              Tắt để ẩn khỏi hoá đơn mà vẫn giữ lại đối chiếu những lần đã nhận.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Huỷ
        </Button>
        <SubmitButton size="sm">{account ? "Lưu thay đổi" : "Thêm"}</SubmitButton>
      </div>
    </form>
  );
}

/**
 * Chọn ảnh QR.
 *
 * Ảnh được đưa vào một `DataTransfer` rồi gán ngược lại cho input, nên form vẫn
 * submit bằng POST thật với trường `qr` — không cần dựng FormData bằng tay và
 * không mất `useActionState`.
 */
function QrPicker({ errors }: { errors: Record<string, string[]> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleFile(fileList: FileList | null) {
    const original = fileList?.[0];
    if (!original) return;

    setLocalError(null);

    let file = original;
    if (original.size > QR_RESIZE_THRESHOLD) {
      setStatus("Đang thu nhỏ ảnh…");
      try {
        const resized = await resizeImage(original);
        file = resized.file;
        setStatus(
          `Đã thu nhỏ ${formatBytes(resized.originalBytes)} → ${formatBytes(resized.resizedBytes)}.`,
        );
      } catch (error) {
        setStatus(null);
        setLocalError((error as Error).message);
        return;
      }
    } else {
      setStatus(null);
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (inputRef.current) inputRef.current.files = transfer.files;

    startTransition(() => setPreview(URL.createObjectURL(file)));
  }

  const message = errors.qr?.[0] ?? localError;

  return (
    <div className="space-y-3 sm:col-span-2">
      <Label htmlFor="qr">
        Ảnh QR<span className="text-destructive"> *</span>
      </Label>

      <div className="flex flex-wrap items-center gap-4">
        {preview ? (
          // Ảnh xem trước là blob: trong máy người dùng, không qua next/image —
          // trình tối ưu ảnh chỉ nhận URL máy chủ biết tải được.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Xem trước mã QR"
            className="size-32 rounded-lg border border-border bg-white object-contain p-1"
          />
        ) : (
          <div className="flex size-32 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <QrCodeIcon className="size-6" />
          </div>
        )}

        <div className="space-y-2">
          <input
            ref={inputRef}
            id="qr"
            name="qr"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            {status?.startsWith("Đang") ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <ImagePlusIcon />
            )}
            {preview ? "Chọn ảnh khác" : "Chọn ảnh QR"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Chụp màn hình mã QR trong app ngân hàng là đủ. Ảnh dưới 1MB được giữ
            nguyên bản để mã không bị nhoè.
          </p>
        </div>
      </div>

      {message && <p className="text-sm text-destructive">{message}</p>}
      {status && !status.startsWith("Đang") && (
        <p className="text-xs text-muted-foreground">{status}</p>
      )}
    </div>
  );
}
