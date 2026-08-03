import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiManager } from "@/features/wifi/components/wifi-manager";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Wifi" };

export default async function WifiSettingsPage() {
  const [networks, rooms] = await Promise.all([db.listWifi(), db.listRooms()]);

  return (
    <div className="space-y-4">
      <Alert variant="info">
        <AlertDescription>
          Wifi nằm trong database (không phải file cấu hình) vì mật khẩu hay đổi và mỗi
          tầng/phòng có thể khác nhau. Người thuê chỉ xem được mạng áp dụng cho phòng của
          họ.
        </AlertDescription>
      </Alert>

      <WifiManager networks={networks} rooms={rooms} />
    </div>
  );
}
