"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { createRoomEvent } from "@/features/rooms/actions";
import { ROOM_EVENT_OPTIONS } from "@/lib/constants";

export function RoomEventForm({ roomId, today }: { roomId: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createRoomEvent, null);
  const errors = fieldErrorsOf(state);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form after a successful save so the next note starts blank.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon />
        Thêm ghi chú
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4"
    >
      <input type="hidden" name="roomId" value={roomId} />

      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="type" label="Loại" required errors={errors}>
          <Select name="type" defaultValue="note">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROOM_EVENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field name="occurredAt" label="Ngày xảy ra" required errors={errors}>
          <Input type="date" defaultValue={today} required />
        </Field>

        <Field name="title" label="Tiêu đề" required errors={errors} className="sm:col-span-2">
          <Input placeholder="Ví dụ: Thay bóng đèn nhà tắm" required />
        </Field>

        <Field
          name="cost"
          label="Chi phí (đ)"
          hint="Để trống nếu không tốn tiền."
          errors={errors}
        >
          <Input type="number" inputMode="numeric" min={0} placeholder="0" />
        </Field>

        <Field name="content" label="Chi tiết" errors={errors} className="sm:col-span-2">
          <Textarea rows={2} placeholder="Ghi thêm nếu cần…" />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Đóng
        </Button>
        <SubmitButton size="sm">Lưu ghi chú</SubmitButton>
      </div>
    </form>
  );
}
