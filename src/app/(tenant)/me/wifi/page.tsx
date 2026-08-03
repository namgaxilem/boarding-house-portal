import type { Metadata } from "next";
import { WifiIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton, SecretField } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/empty-state";
import { NoRoomNotice } from "@/components/common/no-room-notice";
import { getMyTenancy, getMyWifi } from "@/features/tenants/queries";
import { WIFI_SCOPE_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Wifi" };

export default async function MyWifiPage() {
  const tenancy = await getMyTenancy();
  if (!tenancy) return <NoRoomNotice />;

  const networks = await getMyWifi();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Wifi áp dụng cho phòng {tenancy.room.code}. Chạm vào biểu tượng con mắt để hiện
        mật khẩu.
      </p>

      {networks.length === 0 ? (
        <EmptyState
          icon={<WifiIcon />}
          title="Chưa có thông tin wifi"
          description="Chủ trọ chưa thêm mạng wifi nào cho phòng của bạn."
        />
      ) : (
        <ul className="space-y-3">
          {networks.map((network) => (
            <li key={network.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Tên mạng</p>
                      <div className="flex items-center gap-1">
                        <p className="truncate font-medium">{network.ssid}</p>
                        <CopyButton value={network.ssid} label="Sao chép tên mạng" />
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {WIFI_SCOPE_LABEL[network.scope]}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Mật khẩu</p>
                    <SecretField id={network.id} value={network.password} />
                  </div>

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
