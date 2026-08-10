import { Suspense } from "react";
import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { WifiManager } from "@/features/wifi/components/wifi-manager";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Wifi" };

// Chuyển tab trong /admin/settings phải đổi nội dung ngay: ghi chú ở trên là tĩnh,
// bảng wifi đọc DB nên stream sau.
export const instant = true;

export default function WifiSettingsPage() {
  return (
    <div className="space-y-4">
      <Alert variant="info">
        <AlertDescription>
          Wifi nằm trong database (không phải file cấu hình) vì mật khẩu hay đổi và mỗi
          tầng/phòng có thể khác nhau. Người thuê chỉ xem được mạng áp dụng cho phòng của
          họ.
        </AlertDescription>
      </Alert>

      <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
        <Wifi />
      </Suspense>
    </div>
  );
}

async function Wifi() {
  const [networks, rooms] = await Promise.all([db.listWifi(), db.listRooms()]);

  return <WifiManager networks={networks} rooms={rooms} />;
}
