"use client";

import { useEffect } from "react";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with a real error reporter when one is set up.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <TriangleAlertIcon className="size-6" />
      </span>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Có lỗi xảy ra</h1>
        <p className="max-w-sm text-muted-foreground">
          Thử tải lại trang. Nếu vẫn lỗi, báo cho chủ trọ kèm mã bên dưới.
        </p>
        {error.digest && (
          <code className="inline-block rounded-md bg-secondary px-2 py-1 font-mono text-xs">
            {error.digest}
          </code>
        )}
      </div>

      <Button onClick={reset}>
        <RefreshCwIcon />
        Thử lại
      </Button>
    </div>
  );
}
