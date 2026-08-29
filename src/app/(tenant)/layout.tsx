import { Suspense } from "react";

import { requireUser } from "@/lib/auth/dal";
import { TenantBottomNav } from "@/components/layout/tenant-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/common/theme";
import {
  NotificationBell,
  NotificationBellFallback,
} from "@/features/notifications/components/notification-bell";
import { houseConfig } from "@/config/site";

// Guard bảo mật chạy đồng bộ trong layout (xem chú thích ở (admin)/layout.tsx):
// entry vào /me được phép block, điều hướng giữa các trang /me vẫn phải instant.
export const instant = false;

export default async function TenantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Auth only, not role: an admin may open the tenant portal to help someone.
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">

      {/* Header và thanh dưới không đi ra giấy — trang in chỉ còn nội dung. */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur print:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{houseConfig.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.fullName}</p>
        </div>
        {/* Đếm số chưa đọc là một truy vấn riêng — bọc <Suspense> để header hiện
            ngay, chuông điền số vào sau. */}
        <Suspense fallback={<NotificationBellFallback />}>
          <NotificationBell />
        </Suspense>
        <ThemeToggle />
        <UserMenu user={user} />
      </header>

      {/* pb-24 clears the fixed bottom nav; without it the last card is unreachable. */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-24 print:max-w-none print:p-0">
        {children}
      </main>

      <TenantBottomNav />
    </div>
  );
}
