import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import { houseConfig } from "@/config/site";
import type { PaymentAccount } from "@/types";

/** Cách nhận tiền đang bật — thứ người thuê nhìn thấy trên hoá đơn. */
export const listActivePaymentAccounts = cache(async () => db.listPaymentAccounts());

/** Cả dòng đã tắt. Chỉ trang cài đặt gọi hàm này. */
export const listAllPaymentAccounts = cache(async () =>
  db.listPaymentAccounts({ includeInactive: true }),
);

/**
 * Cách nhận tiền để hiển thị, kèm đường lui về `houseConfig.bank`.
 *
 * Nhà trọ nâng cấp từ bản cũ chưa có bảng `payment_accounts` nào — nếu để trống
 * thì hoá đơn tự dưng mất phần chuyển khoản, và người thuê không biết chuyển vào
 * đâu. Tài khoản trong `site.ts` được dựng thành một thẻ ảo cho tới khi chủ trọ
 * thêm thẻ thật đầu tiên; thêm rồi thì file cấu hình thôi không được dùng nữa,
 * để không bao giờ có hai nguồn cùng nói về tiền.
 */
export const listPaymentAccountsForDisplay = cache(
  async (): Promise<PaymentAccount[]> => {
    const accounts = await listActivePaymentAccounts();
    if (accounts.length > 0) return accounts;

    const fallback = houseConfig.bank;
    if (!fallback) return [];

    return [
      {
        id: "config-fallback",
        kind: "bank",
        label: fallback.name,
        bankName: fallback.name,
        accountNumber: fallback.accountNumber,
        accountHolder: fallback.accountHolder,
        qrPath: null,
        qrUrl: null,
        note: null,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(0).toISOString(),
      },
    ];
  },
);
