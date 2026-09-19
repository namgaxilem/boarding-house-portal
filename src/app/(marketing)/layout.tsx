import { Suspense } from "react";
import type { Metadata } from "next";

import { Link } from "@/components/common/link";

import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme";
import {
  MarketingAuthSlot,
  MarketingAuthSlotFallback,
} from "@/components/layout/marketing-auth";
import { houseConfig, fullAddress } from "@/config/site";
import { indexable } from "@/lib/seo";

/**
 * Khu DUY NHẤT được lập chỉ mục.
 *
 * Layout gốc đặt `robots: noIndex` cho toàn site (cấm trước, mở sau). Ba trang
 * dưới nhánh này — `/`, `/rooms`, `/contact` — là ba trang khách vãng lai xem
 * được mà không cần đăng nhập, nên chúng mở lại ở đây.
 *
 * Mở ở LAYOUT chứ không ở từng trang: thêm một trang giới thiệu mới thì nó tự
 * được lập chỉ mục, không phải nhớ khai thêm dòng nào.
 */
export const metadata: Metadata = { robots: indexable };

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <BrandLockup />

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/rooms">Phòng trống</Link>
            </Button>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/contact">Liên hệ</Link>
            </Button>
            <ThemeToggle />
            {/* Đọc phiên đăng nhập là dữ liệu thời-điểm-yêu-cầu, nên bọc
                <Suspense> để vỏ trang công khai vẫn prerender. `min-w` giữ đúng
                bề rộng của nút "Đăng nhập" — avatar hẹp hơn, không có nó thì
                header nhảy một nhịp khi phần này stream vào. */}
            <div className="flex min-w-20 justify-end">
              <Suspense fallback={<MarketingAuthSlotFallback />}>
                <MarketingAuthSlot />
              </Suspense>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-8 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{houseConfig.name}</p>
          <p>{fullAddress()}</p>
          <p>
            Liên hệ: {houseConfig.contact.ownerName} ·{" "}
            <a
              href={`tel:${houseConfig.contact.phone}`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {houseConfig.contact.phone}
            </a>
          </p>
          <nav className="flex flex-wrap gap-4 pt-2 sm:hidden">
            <Link href="/rooms" className="underline underline-offset-4">
              Phòng trống
            </Link>
            <Link href="/contact" className="underline underline-offset-4">
              Liên hệ
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
