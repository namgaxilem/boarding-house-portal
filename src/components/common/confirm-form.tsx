"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2Icon } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A destructive Server Action behind a confirmation dialog.
 *
 * The action still runs as a real form POST, so it works with JavaScript
 * disabled apart from the dialog itself.
 */
export function ConfirmForm({
  action,
  hidden,
  title,
  description,
  confirmLabel = "Xoá",
  triggerLabel,
  triggerProps,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  title: string;
  description: string;
  confirmLabel?: string;
  triggerLabel: React.ReactNode;
  triggerProps?: ButtonProps;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" {...triggerProps}>
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form action={action}>
          {Object.entries(hidden ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <ConfirmSubmit label={confirmLabel} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending && <Loader2Icon className="animate-spin" />}
      {pending ? "Đang xử lý…" : label}
    </Button>
  );
}
