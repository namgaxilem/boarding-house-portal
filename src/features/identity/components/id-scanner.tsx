"use client";

import {
  useActionState,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  CheckCircle2Icon,
  ImageIcon,
  Loader2Icon,
  QrCodeIcon,
  RotateCcwIcon,
  SendIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage, fieldErrorsOf } from "@/components/common/form";
import { parseCccdQr, type CccdData } from "@/lib/cccd";
import { decodeQr, supportsCamera } from "@/lib/qr";
import { resizeImage } from "@/lib/image";
import { cn } from "@/lib/utils";

import { submitIdDocument } from "../actions";
import { QrCameraDialog } from "./qr-camera";

/**
 * Màn quét CCCD của người thuê.
 *
 * Ba đường vào, xếp theo thứ tự dễ dùng giảm dần — người thuê nhà trọ dùng đủ
 * loại máy, có cái không mở nổi camera trong trình duyệt:
 *
 *   1. Quét trực tiếp bằng camera (nhanh nhất).
 *   2. Chụp/chọn một ảnh mặt trước rồi đọc mã QR trong ảnh đó. Chạy được cả trên
 *      máy chặn camera, và ảnh đó dùng luôn làm ảnh mặt trước — bớt một thao tác.
 *   3. Gõ tay, khi thẻ xước hoặc mã QR mờ.
 *
 * Dữ liệu quét ra luôn cho SỬA ĐƯỢC trước khi gửi. Mã QR trên thẻ đời đầu đôi
 * khi ghi nơi thường trú đã cũ, và người thuê là người biết rõ nhất.
 */

interface Photo {
  file: File;
  /** blob: URL để xem trước. Thu hồi ngay khi thay ảnh, tránh rò bộ nhớ. */
  url: string;
}

type Fields = Omit<CccdData, "raw">;

const EMPTY: Fields = {
  idNumber: "",
  oldIdNumber: null,
  fullName: "",
  dateOfBirth: null,
  gender: null,
  residence: null,
  issuedOn: null,
};

export function IdScanner({ suggestedName }: { suggestedName?: string }) {
  const [state, formAction] = useActionState(submitIdDocument, null);
  const [isSubmitting, startTransition] = useTransition();

  const [fields, setFields] = useState<Fields>({ ...EMPTY, fullName: suggestedName ?? "" });
  const [source, setSource] = useState<"qr" | "manual">("manual");
  const [scanned, setScanned] = useState(false);

  // `supportsCamera()` đọc `navigator` và `window.isSecureContext` — không tồn
  // tại lúc render trên server. `useSyncExternalStore` cho khai riêng giá trị
  // phía server (false) nên React không báo lệch hydration, và khác `useEffect`
  // + `setState` ở chỗ không tốn một vòng render thừa.
  const canUseCamera = useSyncExternalStore(
    // Khả năng dùng camera không đổi giữa chừng, nên không cần đăng ký lắng nghe.
    () => () => {},
    () => supportsCamera(),
    () => false,
  );

  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const [front, setFront] = useState<Photo | null>(null);
  const [back, setBack] = useState<Photo | null>(null);

  const qrFileRef = useRef<HTMLInputElement>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const errors = fieldErrorsOf(state);
  const disabled = isSubmitting || busy !== null;

  function applyQrText(text: string) {
    const result = parseCccdQr(text);

    if (!result.ok) {
      setLocalError(result.error);
      return false;
    }

    // `raw` cố ý bị bỏ: nó là chuỗi thô để soi lỗi, không phải thứ đem hiển thị
    // hay gửi lên. Liệt kê từng trường thay vì rest-spread để khi `CccdData` có
    // thêm cột mới thì TypeScript bắt phải quyết định xử lý nó ở đây.
    setFields({
      idNumber: result.data.idNumber,
      oldIdNumber: result.data.oldIdNumber,
      fullName: result.data.fullName,
      dateOfBirth: result.data.dateOfBirth,
      gender: result.data.gender,
      residence: result.data.residence,
      issuedOn: result.data.issuedOn,
    });
    setSource("qr");
    setScanned(true);
    setLocalError(null);
    return true;
  }

  function replacePhoto(side: "front" | "back", photo: Photo | null) {
    const setter = side === "front" ? setFront : setBack;
    setter((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return photo;
    });
  }

  /** Nén ảnh ngay trong máy rồi mới giữ lại — xem lib/image.ts. */
  async function prepare(file: File): Promise<Photo> {
    const { file: resized } = await resizeImage(file);
    return { file: resized, url: URL.createObjectURL(resized) };
  }

  async function onPickPhoto(side: "front" | "back", file: File | null) {
    if (!file) return;

    setLocalError(null);
    setBusy("Đang xử lý ảnh…");
    try {
      replacePhoto(side, await prepare(file));
    } catch (error) {
      setLocalError((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /** Đường số 2: đọc mã QR từ một ảnh, và dùng luôn ảnh đó làm mặt trước. */
  async function onPickQrImage(file: File | null) {
    if (!file) return;

    setLocalError(null);
    setBusy("Đang tìm mã QR trong ảnh…");

    try {
      // Giải mã trên file GỐC, không phải bản đã nén: nén xuống 1600px làm mã QR
      // mờ đi và tỉ lệ đọc được tụt hẳn.
      const text = await decodeQr(file);

      if (!text) {
        setLocalError(
          "Không thấy mã QR trong ảnh. Chụp lại gần hơn, đủ sáng, không bị loá.",
        );
        return;
      }

      if (applyQrText(text)) {
        setBusy("Đang xử lý ảnh…");
        replacePhoto("front", await prepare(file));
      }
    } catch (error) {
      setLocalError((error as Error).message);
    } finally {
      setBusy(null);
      if (qrFileRef.current) qrFileRef.current.value = "";
    }
  }

  function onSubmit() {
    setLocalError(null);

    if (!front || !back) {
      setLocalError("Cần ảnh cả hai mặt của thẻ.");
      return;
    }

    const formData = new FormData();
    formData.set("idNumber", fields.idNumber);
    formData.set("oldIdNumber", fields.oldIdNumber ?? "");
    formData.set("fullName", fields.fullName ?? "");
    formData.set("dateOfBirth", fields.dateOfBirth ?? "");
    formData.set("issuedOn", fields.issuedOn ?? "");
    formData.set("gender", fields.gender ?? "");
    formData.set("residence", fields.residence ?? "");
    formData.set("source", source);
    formData.set("front", front.file);
    formData.set("back", back.file);

    startTransition(() => formAction(formData));
  }

  return (
    <div className="space-y-5">
      <FormMessage state={state} />

      {localError && (
        <p className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          {localError}
        </p>
      )}

      {/* ------------------------------------------------------------ quét */}

      <div className="space-y-2">
        {scanned ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/8 px-3 py-2.5 text-sm">
            <CheckCircle2Icon className="size-4 shrink-0 text-success" />
            <span className="flex-1">Đã đọc được mã QR trên thẻ.</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                setScanned(false);
                setSource("manual");
              }}
            >
              <RotateCcwIcon />
              Quét lại
            </Button>
          </div>
        ) : (
          <>
            {canUseCamera && (
              <Button
                type="button"
                className="w-full"
                disabled={disabled}
                onClick={() => setCameraOpen(true)}
              >
                <QrCodeIcon />
                Quét mã QR trên thẻ
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={disabled}
              onClick={() => qrFileRef.current?.click()}
            >
              {busy ? <Loader2Icon className="animate-spin" /> : <ImageIcon />}
              {busy ?? "Chụp ảnh mặt trước để đọc mã"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Mã QR nằm ở góc trên bên phải mặt trước thẻ. Không đọc được thì điền tay
              bên dưới cũng được.
            </p>
          </>
        )}
      </div>

      <input
        ref={qrFileRef}
        type="file"
        accept="image/*"
        // `capture` mở thẳng camera chụp ảnh trên điện thoại; máy tính bỏ qua
        // thuộc tính này và mở hộp thoại chọn file như thường.
        capture="environment"
        className="sr-only"
        onChange={(event) => onPickQrImage(event.target.files?.[0] ?? null)}
      />

      {/* ------------------------------------------------------- thông tin */}

      <div className="space-y-4 border-t border-border pt-5">
        <Field
          name="idNumber"
          label="Số CCCD / CMND"
          required
          errors={errors}
          hint="12 số trên thẻ căn cước, hoặc 9 số nếu là CMND cũ"
        >
          <Input
            inputMode="numeric"
            autoComplete="off"
            value={fields.idNumber}
            onChange={(event) =>
              setFields((current) => ({ ...current, idNumber: event.target.value }))
            }
          />
        </Field>

        <Field name="fullName" label="Họ và tên trên thẻ" errors={errors}>
          <Input
            value={fields.fullName ?? ""}
            onChange={(event) =>
              setFields((current) => ({ ...current, fullName: event.target.value }))
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="dateOfBirth" label="Ngày sinh" errors={errors}>
            <Input
              type="date"
              value={fields.dateOfBirth ?? ""}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  dateOfBirth: event.target.value || null,
                }))
              }
            />
          </Field>

          <Field name="issuedOn" label="Ngày cấp" errors={errors}>
            <Input
              type="date"
              value={fields.issuedOn ?? ""}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  issuedOn: event.target.value || null,
                }))
              }
            />
          </Field>
        </div>

        <Field name="gender" label="Giới tính" errors={errors}>
          <div className="flex gap-2">
            {(["Nam", "Nữ"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                variant={fields.gender === value ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() =>
                  setFields((current) => ({
                    ...current,
                    gender: current.gender === value ? null : value,
                  }))
                }
              >
                {value}
              </Button>
            ))}
          </div>
        </Field>

        <Field name="residence" label="Nơi thường trú" errors={errors}>
          <Input
            value={fields.residence ?? ""}
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                residence: event.target.value || null,
              }))
            }
          />
        </Field>
      </div>

      {/* ------------------------------------------------------------- ảnh */}

      <div className="space-y-3 border-t border-border pt-5">
        <div>
          <p className="text-sm font-medium">Ảnh hai mặt thẻ</p>
          <p className="text-xs text-muted-foreground">
            Chụp trên nền tối, đủ sáng, không loá. Ảnh được thu nhỏ ngay trong máy
            trước khi gửi và chỉ chủ trọ xem được.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PhotoSlot
            label="Mặt trước"
            photo={front}
            disabled={disabled}
            onPick={() => frontRef.current?.click()}
          />
          <PhotoSlot
            label="Mặt sau"
            photo={back}
            disabled={disabled}
            onPick={() => backRef.current?.click()}
          />
        </div>

        <input
          ref={frontRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => onPickPhoto("front", event.target.files?.[0] ?? null)}
        />
        <input
          ref={backRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => onPickPhoto("back", event.target.files?.[0] ?? null)}
        />
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={disabled || !fields.idNumber || !front || !back}
        onClick={onSubmit}
      >
        {isSubmitting ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
        {isSubmitting ? "Đang gửi…" : "Gửi cho chủ trọ duyệt"}
      </Button>

      <QrCameraDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onResult={(text) => {
          if (applyQrText(text)) setCameraOpen(false);
        }}
      />
    </div>
  );
}

function PhotoSlot({
  label,
  photo,
  disabled,
  onPick,
}: {
  label: string;
  photo: Photo | null;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={cn(
        "flex aspect-[1.585/1] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground transition-colors",
        "hover:border-primary/50 hover:text-foreground disabled:opacity-60",
        photo && "border-solid border-border",
      )}
    >
      {photo ? (
        // Ảnh nằm ở blob: URL trong bộ nhớ trình duyệt, next/image không tối ưu
        // được và cũng không cần — nó sẽ bị vứt đi ngay sau khi gửi.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={label} className="size-full object-cover" />
      ) : (
        <>
          <ImageIcon className="size-5" />
          {label}
        </>
      )}
    </button>
  );
}
