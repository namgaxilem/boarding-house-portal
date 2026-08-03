"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

/**
 * Small building blocks shared by every form.
 *
 * They read the server's `ActionResult` directly, so a field error rendered by
 * the browser and one returned by the server look identical.
 */

interface FieldProps {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  errors?: Record<string, string[]>;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  name,
  label,
  hint,
  required,
  errors,
  className,
  children,
}: FieldProps) {
  const message = errors?.[name]?.[0];
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className={cn("group space-y-2", className)}>
      <Label htmlFor={name}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>

      {/* Clone-free: children wire up their own id/name, we only add ARIA. */}
      <div
        data-invalid={message ? "true" : undefined}
        className="[&>*]:aria-invalid:border-destructive"
      >
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
              id: name,
              name,
              "aria-invalid": message ? true : undefined,
              "aria-describedby": message ? errorId : hint ? hintId : undefined,
            })
          : children}
      </div>

      {message ? (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircleIcon className="size-3.5 shrink-0" />
          {message}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Disables itself and shows a spinner while the enclosing form is submitting. */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && <Loader2Icon className="animate-spin" />}
      {pending ? (pendingText ?? "Đang lưu…") : children}
    </Button>
  );
}

/** Top-of-form banner for the overall success/failure of the last submit. */
export function FormMessage({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;

  if (state.ok) {
    const text = typeof state.data === "string" ? state.data : "Đã lưu thay đổi.";
    return (
      <Alert variant="success" role="status">
        <CheckCircle2Icon />
        <AlertDescription>{text}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  );
}

export function fieldErrorsOf(state: ActionResult<unknown> | null) {
  return state && !state.ok ? (state.fieldErrors ?? {}) : {};
}
