"use client";

import { Link } from "@/components/common/link";
import { useActionState } from "react";
import { SaveIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createRoom, updateRoom } from "@/features/rooms/actions";
import { ROOM_STATUS_OPTIONS } from "@/lib/constants";
import { houseConfig } from "@/config/site";
import type { Room } from "@/types";

export function RoomForm({ room }: { room?: Room }) {
  const action = room ? updateRoom.bind(null, room.id) : createRoom;
  const [state, formAction] = useActionState(action, null);
  const errors = fieldErrorsOf(state);

  const defaults = houseConfig.defaults;

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      <Card>
        <CardHeader>
          <CardTitle>Thông tin phòng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <Field name="code" label="Mã phòng" required errors={errors}>
            <Input defaultValue={room?.code} placeholder="P101" required />
          </Field>

          <Field name="floor" label="Tầng" required errors={errors}>
            <Input type="number" inputMode="numeric" min={0} defaultValue={room?.floor ?? 1} required />
          </Field>

          <Field name="areaM2" label="Diện tích (m²)" required errors={errors}>
            {/* step="any": a fixed step makes the browser reject anything that is
                not a multiple of it, e.g. 18.3 m². */}
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min={1}
              defaultValue={room?.areaM2 ?? 20}
              required
            />
          </Field>

          <Field
            name="maxOccupants"
            label="Số người tối đa"
            required
            errors={errors}
            hint="Vượt số này thì không nhận thêm người vào phòng được."
          >
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              defaultValue={room?.maxOccupants ?? defaults.maxOccupants}
              required
            />
          </Field>

          <Field
            name="status"
            label="Trạng thái"
            errors={errors}
            hint="Đang ở / Còn trống được tính tự động từ hợp đồng. Chỉ chọn tay khi phòng đang sửa hoặc đã giữ chỗ."
            className="sm:col-span-2"
          >
            <StatusSelect defaultValue={room?.status ?? "vacant"} />
          </Field>

          <Field name="description" label="Mô tả" errors={errors} className="sm:col-span-2">
            <Textarea
              defaultValue={room?.description ?? ""}
              placeholder="Ví dụ: phòng góc, cửa sổ hướng đông, có gác lửng."
              rows={3}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giá và chi phí</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <Field name="basePrice" label="Giá thuê (đ/tháng)" required errors={errors}>
            {/* step={1}, not a round increment: `step` doubles as a validation
                rule, so step={100000} would make the browser refuse 2.750.000 đ
                with an untranslated error and silently block submit. */}
            <Input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              defaultValue={room?.basePrice ?? 2500000}
              required
            />
          </Field>

          <Field name="electricPrice" label="Giá điện (đ/kWh)" required errors={errors}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={room?.electricPrice ?? defaults.electricPrice}
              required
            />
          </Field>

          <Field name="waterPrice" label="Giá nước (đ/m³)" required errors={errors}>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={room?.waterPrice ?? defaults.waterPrice}
              required
            />
          </Field>

          <Field
            name="servicePrice"
            label="Phí dịch vụ (đ/tháng)"
            hint="Rác, gửi xe, internet…"
            required
            errors={errors}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={room?.servicePrice ?? defaults.servicePrice}
              required
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={room ? `/admin/rooms/${room.id}` : "/admin/rooms"}>Huỷ</Link>
        </Button>
        <SubmitButton>
          <SaveIcon />
          {room ? "Lưu thay đổi" : "Tạo phòng"}
        </SubmitButton>
      </div>
    </form>
  );
}

/** `name` makes Radix render a hidden native select, so this posts with the form. */
function StatusSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <Select name="status" defaultValue={defaultValue}>
      <SelectTrigger>
        <SelectValue placeholder="Chọn trạng thái" />
      </SelectTrigger>
      <SelectContent>
        {ROOM_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
