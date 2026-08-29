"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DownloadIcon, ShareIcon, SquarePlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { houseConfig } from "@/config/site";

/**
 * Lời mời cài app lên màn hình chính.
 *
 * Hai nền tảng, hai đường hoàn toàn khác nhau — không gộp được:
 *
 *   Android/Chrome  Trình duyệt bắn sự kiện `beforeinstallprompt`. Bắt lấy, chặn
 *                   banner mặc định, để dành gọi `prompt()` khi người dùng bấm
 *                   nút của mình. Sự kiện chỉ bắn MỘT lần cho mỗi lần tải trang.
 *
 *   iOS/Safari      Không có API nào hết. Apple không cho web tự mời cài. Cách
 *                   duy nhất là chỉ người dùng bấm Chia sẻ → "Thêm vào MH chính".
 *                   Và chỉ Safari làm được — Chrome trên iPhone thì chịu.
 *
 * Đã cài rồi, hoặc đã bấm tắt một lần, thì không hiện lại.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "install-prompt-dismissed";

/* -------------------------------------------------------------------------- */
/*  Trạng thái môi trường                                                     */
/*                                                                            */
/*  Ba dữ kiện dưới đây chỉ đọc được ở trình duyệt và không tự đổi: đã cài     */
/*  chưa, có phải Safari trên iOS không, đã bấm tắt chưa. Đọc chúng bằng       */
/*  useSyncExternalStore thay vì useEffect + setState: khai riêng được giá trị */
/*  phía server nên không lệch hydration, và không tốn một vòng render thừa    */
/*  ngay khi trang vừa hiện.                                                   */
/* -------------------------------------------------------------------------- */

interface InstallEnvironment {
  installed: boolean;
  iosSafari: boolean;
  dismissed: boolean;
}

/** Trên server chưa biết gì cả → khai là "đã cài" để thẻ không loé lên rồi biến mất. */
const SERVER_ENVIRONMENT: InstallEnvironment = {
  installed: true,
  iosSafari: false,
  dismissed: true,
};

let snapshot: InstallEnvironment | null = null;
const listeners = new Set<() => void>();

function readEnvironment(): InstallEnvironment {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);

  return {
    // `display-mode: standalone` đúng với Android; `navigator.standalone` là cờ
    // riêng của iOS. Cần cả hai mới nhận ra đủ mọi trường hợp đã cài.
    installed:
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true,

    // Trên iOS mọi trình duyệt đều chạy nhân WebKit, nhưng chỉ Safari có nút
    // "Thêm vào MH chính". Chrome/Firefox trên iPhone tự khai CriOS/FxiOS.
    iosSafari: isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua),

    dismissed: localStorage.getItem(DISMISS_KEY) === "1",
  };
}

/** Phải trả về ĐÚNG một tham chiếu giữa các lần render, nếu không React lặp vô tận. */
function getSnapshot() {
  return (snapshot ??= readEnvironment());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function dismissForever() {
  localStorage.setItem(DISMISS_KEY, "1");
  snapshot = { ...getSnapshot(), dismissed: true };
  listeners.forEach((listener) => listener());
}

/* -------------------------------------------------------------------------- */

export function InstallPrompt() {
  const environment = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_ENVIRONMENT);

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    function onBeforeInstall(event: Event) {
      event.preventDefault(); // chặn banner mặc định, tự quyết định lúc nào mời
      setDeferred(event as BeforeInstallPromptEvent);
    }

    // Cài xong thì gỡ thẻ ngay, không đợi tải lại trang.
    function onInstalled() {
      setJustInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // Sự kiện đã dùng thì không gọi lại được, phải chờ lần tải trang sau.
    setDeferred(null);
    if (outcome === "accepted") setJustInstalled(true);
  }

  if (environment.installed || environment.dismissed || justInstalled) return null;

  const platform = deferred ? "android" : environment.iosSafari ? "ios" : null;
  if (!platform) return null;

  return (
    <Card className="border-primary/25 bg-accent/40">
      <CardContent className="flex gap-3 p-4">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <DownloadIcon className="size-4.5" />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold">Cài {houseConfig.shortName} vào máy</p>

          {platform === "android" ? (
            <>
              <p className="text-xs text-muted-foreground">
                Mở nhanh từ màn hình chính, không cần gõ địa chỉ, không tốn dung lượng
                như app tải từ CH Play.
              </p>
              <Button size="sm" onClick={install}>
                <DownloadIcon />
                Cài đặt
              </Button>
            </>
          ) : (
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-foreground">1.</span>
                Bấm nút Chia sẻ
                <ShareIcon className="size-3.5 shrink-0" />
                ở thanh dưới Safari
              </li>
              <li className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-foreground">2.</span>
                Kéo xuống, chọn &ldquo;Thêm vào MH chính&rdquo;
                <SquarePlusIcon className="size-3.5 shrink-0" />
              </li>
              <li>
                <span className="font-medium text-foreground">3.</span> Bấm
                &ldquo;Thêm&rdquo; ở góc phải
              </li>
            </ol>
          )}
        </div>

        <button
          type="button"
          onClick={dismissForever}
          aria-label="Ẩn lời mời cài đặt"
          className="-mr-1 -mt-1 size-7 shrink-0 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="mx-auto size-4" />
        </button>
      </CardContent>
    </Card>
  );
}
