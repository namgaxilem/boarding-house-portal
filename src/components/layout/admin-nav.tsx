"use client";

import { Suspense, use } from "react";
import { Link } from "@/components/common/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ADMIN_NAV, isActive, type NavItem } from "@/components/layout/nav-items";
import { BrandLockup } from "@/components/common/logo";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

/**
 * Số việc tồn đọng, hiện trên hai mục sinh ra từ hành động của người khác.
 *
 * Nhận vào một PROMISE, không phải giá trị đã await.
 *
 * Đếm việc tồn cần biết "hôm nay là tháng mấy", và dưới Cache Components thì mọi
 * thứ đụng vào thời gian hiện tại đều là dữ liệu thời-điểm-yêu-cầu. Nếu layout
 * `await` nó, cả vỏ trang /admin thôi không prerender được, và mọi <Suspense>
 * trong các trang con kẹt lại ở fallback. Truyền promise xuống rồi đọc bằng
 * `use()` trong một ranh giới Suspense riêng: vỏ trang hiện ngay, hai con số
 * chảy vào sau.
 */
export type NavBadges = Partial<Record<NonNullable<NavItem["badge"]>, number>>;

function BadgeCount({
  badges,
  name,
}: {
  badges: Promise<NavBadges>;
  name: NonNullable<NavItem["badge"]>;
}) {
  const count = use(badges)[name] ?? 0;
  if (count === 0) return null;

  return (
    <span
      className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-warning/20 px-1.5 text-xs font-semibold tabular-nums text-warning-foreground dark:text-warning"
      // Con số một mình không nói lên gì với trình đọc màn hình.
      aria-label={`${count} việc chưa xử lý`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavLinks({
  badges,
  onNavigate,
}: {
  badges?: Promise<NavBadges>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Điều hướng quản trị">
      {ADMIN_NAV.map((item) => {
        const active = isActive(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-secondary",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && badges && (
              // fallback={null}: chỗ trống trong khi chờ tốt hơn một ô xám nhấp
              // nháy trên thanh điều hướng mỗi lần mở trang.
              <Suspense fallback={null}>
                <BadgeCount badges={badges} name={item.badge} />
              </Suspense>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <BrandLockup
      href="/admin"
      className={cn("px-5 py-4", className)}
      labelClassName="text-sm"
    />
  );
}

/** Fixed rail from `md` up. */
export function AdminSidebar({ badges }: { badges?: Promise<NavBadges> }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block print:hidden">
      <div className="sticky top-0 flex h-dvh flex-col">
        <Brand />
        <NavLinks badges={badges} />
      </div>
    </aside>
  );
}

/** Hamburger + drawer below `md`. Open state lives in the Zustand UI store. */
export function AdminMobileNav({ badges }: { badges?: Promise<NavBadges> }) {
  const open = useUiStore((state) => state.mobileNavOpen);
  const setOpen = useUiStore((state) => state.setMobileNavOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SheetTitle className="sr-only">Điều hướng quản trị</SheetTitle>
        <Brand />
        <NavLinks badges={badges} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
