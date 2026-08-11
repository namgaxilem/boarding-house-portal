"use client";

import { Link } from "@/components/common/link";
import { useActionState, useState } from "react";
import { LogInIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { checkIn } from "@/features/tenancies/actions";
import { formatVND } from "@/lib/format";
import type { RoomWithOccupancy, TenantWithCurrentRoom } from "@/types";

export function CheckInForm({
  rooms,
  tenants,
  defaultRoomId,
  defaultTenantId,
  today,
}: {
  rooms: RoomWithOccupancy[];
  tenants: TenantWithCurrentRoom[];
  defaultRoomId?: string;
  defaultTenantId?: string;
  today: string;
}) {
  const [state, formAction] = useActionState(checkIn, null);
  const errors = fieldErrorsOf(state);

  const [roomId, setRoomId] = useState(defaultRoomId ?? "");
  const [isPrimary, setIsPrimary] = useState(true);

  const selectedRoom = rooms.find((room) => room.id === roomId);

  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />

      <Card>
        <CardHeader>
          <CardTitle>Chọn phòng và người thuê</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <Field name="roomId" label="Phòng" required errors={errors}>
            <Select name="roomId" value={roomId} onValueChange={setRoomId} required>
              <SelectTrigger>
                <SelectValue placeholder="Chọn phòng còn chỗ" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.code} · {formatVND(room.basePrice)} · còn{" "}
                    {room.maxOccupants - room.occupants.length} chỗ
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field name="tenantId" label="Người thuê" required errors={errors}>
            <Select name="tenantId" defaultValue={defaultTenantId ?? ""} required>
              <SelectTrigger>
                <SelectValue placeholder="Chọn người chưa có phòng" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.fullName}
                    {tenant.phone ? ` · ${tenant.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Room facts update as soon as a room is picked, so the landlord can
              sanity-check the rent before typing it. */}
          {selectedRoom && (
            <p className="rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground sm:col-span-2">
              {selectedRoom.code}: tầng {selectedRoom.floor} · {selectedRoom.areaM2}m² ·
              giá niêm yết {formatVND(selectedRoom.basePrice)}/tháng · đang có{" "}
              {selectedRoom.occupants.length}/{selectedRoom.maxOccupants} người
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Điều khoản</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
          <Field name="startDate" label="Ngày nhận phòng" required errors={errors}>
            <Input type="date" defaultValue={today} required />
          </Field>

          <Field
            name="monthlyPrice"
            label="Giá thuê thoả thuận (đ/tháng)"
            hint="Được lưu riêng cho hợp đồng này. Tăng giá phòng sau này không ảnh hưởng."
            required
            errors={errors}
          >
            {/* step={1}: `step` is also a validation rule, so a round increment
                would make the browser reject a negotiated 2.750.000 đ outright. */}
            <Input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              // Re-mounts when the room changes so the default follows the pick.
              key={selectedRoom?.id ?? "none"}
              defaultValue={selectedRoom?.basePrice ?? 0}
              required
            />
          </Field>

          <Field name="deposit" label="Tiền cọc (đ)" required errors={errors}>
            <Input
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              key={`deposit-${selectedRoom?.id ?? "none"}`}
              defaultValue={selectedRoom?.basePrice ?? 0}
              required
            />
          </Field>

          <div className="flex items-start gap-3 sm:col-span-2">
            <Switch
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={setIsPrimary}
              aria-describedby="isPrimary-hint"
            />
            <input type="hidden" name="isPrimary" value={isPrimary ? "true" : "false"} />
            <div className="space-y-0.5">
              <Label htmlFor="isPrimary">Người đứng tên hợp đồng</Label>
              <p id="isPrimary-hint" className="text-xs text-muted-foreground">
                Tắt nếu đây là người ở ghép, không đứng tên và không đóng cọc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/rooms">Huỷ</Link>
        </Button>
        <SubmitButton pendingText="Đang tạo hợp đồng…">
          <LogInIcon />
          Cho nhận phòng
        </SubmitButton>
      </div>
    </form>
  );
}
