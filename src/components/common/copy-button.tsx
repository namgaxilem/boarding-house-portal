"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Sao chép",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // Selecting the text by hand still works, so fail quietly.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={copy}
      aria-label={copied ? "Đã sao chép" : label}
      title={copied ? "Đã sao chép" : label}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
    </Button>
  );
}

/**
 * A password shown as dots until tapped. Used for wifi credentials, which people
 * read out loud in shared spaces.
 */
export function SecretField({
  id,
  value,
  className,
}: {
  id: string;
  value: string;
  className?: string;
}) {
  const revealed = useUiStore((state) => Boolean(state.revealedSecrets[id]));
  const toggle = useUiStore((state) => state.toggleSecret);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <code className="min-w-0 flex-1 truncate rounded-md bg-secondary px-2.5 py-1.5 font-mono text-sm">
        {revealed ? value : "•".repeat(Math.min(value.length, 12))}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => toggle(id)}
        aria-label={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="text-muted-foreground hover:text-foreground"
      >
        {revealed ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
      <CopyButton value={value} label="Sao chép mật khẩu" />
    </div>
  );
}
