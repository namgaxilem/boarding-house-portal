"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PencilIcon, PlusIcon, WifiIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormMessage, SubmitButton, fieldErrorsOf } from "@/components/common/form";
import { ConfirmForm } from "@/components/common/confirm-form";
import { SecretField } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/empty-state";
import { deleteWifi, saveWifi } from "@/features/wifi/actions";
import { WIFI_SCOPE_LABEL } from "@/lib/constants";
import type { Room, WifiNetwork, WifiScope } from "@/types";

export function WifiManager({
  networks,
  rooms,
}: {
  networks: WifiNetwork[];
  rooms: Room[];
}) {
  const [editing, setEditing] = useState<WifiNetwork | "new" | null>(null);

  return (
    <div className="space-y-4">
      {editing === null ? (
        <Button variant="outline" onClick={() => setEditing("new")}>
          <PlusIcon />
          Thêm mạng wifi
        </Button>
      ) : (
        <WifiForm
          network={editing === "new" ? undefined : editing}
          rooms={rooms}
          onDone={() => setEditing(null)}
        />
      )}

      {networks.length === 0 ? (
        <EmptyState
          icon={<WifiIcon />}
          title="Chưa có mạng wifi nào"
          description="Thêm wifi để người thuê tự xem mật khẩu, khỏi phải hỏi lại."
        />
      ) : (
        <ul className="space-y-3">
          {networks.map((network) => (
            <li key={network.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">{network.ssid}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">
                          {WIFI_SCOPE_LABEL[network.scope]}
                        </Badge>
                        {network.scope === "floor" && (
                          <Badge variant="outline">Tầng {network.floor}</Badge>
                        )}
                        {network.scope === "room" && (
                          <Badge variant="outline">
                            {rooms.find((room) => room.id === network.roomId)?.code ??
                              "Phòng đã xoá"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(network)}
                      >
                        <PencilIcon />
                        Sửa
                      </Button>
                      <ConfirmForm
                        action={deleteWifi}
                        hidden={{ wifiId: network.id }}
                        title={`Xoá mạng ${network.ssid}?`}
                        description="Người thuê trong phạm vi này sẽ không xem được mật khẩu nữa."
                        triggerLabel="Xoá"
                        triggerProps={{
                          variant: "ghost",
                          size: "sm",
                          className: "text-muted-foreground hover:text-destructive",
                        }}
                      />
                    </div>
                  </div>

                  <SecretField id={network.id} value={network.password} />

                  {network.note && (
                    <p className="text-sm text-muted-foreground">{network.note}</p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WifiForm({
  network,
  rooms,
  onDone,
}: {
  network?: WifiNetwork;
  rooms: Room[];
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(saveWifi, null);
  const errors = fieldErrorsOf(state);
  const [scope, setScope] = useState<WifiScope>(network?.scope ?? "global");
  const closed = useRef(false);

  // Collapse the form once the server confirms the save.
  useEffect(() => {
    if (state?.ok && !closed.current) {
      closed.current = true;
      onDone();
    }
  }, [state, onDone]);

  const floors = [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4"
    >
      {network && <input type="hidden" name="wifiId" value={network.id} />}

      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="ssid" label="Tên mạng (SSID)" required errors={errors}>
          <Input defaultValue={network?.ssid} placeholder="NhaTro-Tang1" required />
        </Field>

        <Field name="password" label="Mật khẩu" required errors={errors}>
          <Input type="text" defaultValue={network?.password} required />
        </Field>

        <Field name="scope" label="Áp dụng cho" required errors={errors}>
          <Select
            name="scope"
            value={scope}
            onValueChange={(value) => setScope(value as WifiScope)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Toàn nhà</SelectItem>
              <SelectItem value="floor">Một tầng</SelectItem>
              <SelectItem value="room">Một phòng</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {scope === "floor" && (
          <Field name="floor" label="Tầng" required errors={errors}>
            <Select name="floor" defaultValue={network?.floor?.toString() ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn tầng" />
              </SelectTrigger>
              <SelectContent>
                {floors.map((floor) => (
                  <SelectItem key={floor} value={String(floor)}>
                    Tầng {floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {scope === "room" && (
          <Field name="roomId" label="Phòng" required errors={errors}>
            <Select name="roomId" defaultValue={network?.roomId ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn phòng" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field name="note" label="Ghi chú" errors={errors} className="sm:col-span-2">
          <Input
            defaultValue={network?.note ?? ""}
            placeholder="Ví dụ: router đặt cuối hành lang"
          />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Huỷ
        </Button>
        <SubmitButton size="sm">{network ? "Lưu thay đổi" : "Thêm mạng"}</SubmitButton>
      </div>
    </form>
  );
}
