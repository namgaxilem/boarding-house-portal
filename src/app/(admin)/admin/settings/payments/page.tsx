import { Suspense } from "react";
import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentManager } from "@/features/payments/components/payment-manager";
import { listAllPaymentAccounts } from "@/features/payments/queries";

export const metadata: Metadata = { title: "Nhận tiền" };

export const instant = true;

export default function PaymentSettingsPage() {
  return (
    <div className="space-y-4">
      <Alert variant="info">
        <AlertDescription>
          Số tài khoản và ảnh QR nằm trong database, không nằm trong file cấu hình:
          đổi ngân hàng hay thêm QR MoMo không nên cần một lần deploy. Thẻ đang bật sẽ
          hiện trên mọi hoá đơn chưa thu, theo đúng thứ tự bên dưới.
        </AlertDescription>
      </Alert>

      <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
        <Payments />
      </Suspense>
    </div>
  );
}

async function Payments() {
  const accounts = await listAllPaymentAccounts();
  return <PaymentManager accounts={accounts} />;
}
