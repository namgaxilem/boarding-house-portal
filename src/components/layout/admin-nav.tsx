"use client";

import { Link } from "@/components/common/link";
import { usePathname } from "next/navigation";
import { BuildingIcon, MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ADMIN_NAV, isActive } from "@/components/layout/nav-items";
import { useUiStore } from "@/stores/ui-store";
import { houseConfig } from "@/config/site";
import { cn } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/admin"
      className={cn("flex items-center gap-2.5 px-5 py-4 font-semibold", className)}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BuildingIcon className="size-4" />
      </span>
      <span className="truncate text-sm">{houseConfig.name}</span>
    </Link>
  );
}

/** Fixed rail from `md` up. */
export function AdminSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
      <div className="sticky top-0 flex h-dvh flex-col">
        <Brand />
        <NavLinks />
      </div>
    </aside>
  );
}

/** Hamburger + drawer below `md`. Open state lives in the Zustand UI store. */
export function AdminMobileNav() {
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
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
