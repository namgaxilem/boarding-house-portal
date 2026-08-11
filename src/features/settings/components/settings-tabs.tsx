"use client";

import { Link } from "@/components/common/link";
import { usePathname } from "next/navigation";
import { BuildingIcon, KeyRoundIcon, WifiIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/settings", label: "Nhà trọ", icon: BuildingIcon },
  { href: "/admin/settings/wifi", label: "Wifi", icon: WifiIcon },
  { href: "/admin/settings/account", label: "Tài khoản", icon: KeyRoundIcon },
];

/**
 * Links rather than a Radix Tabs component: each tab is a real route, so it must
 * be shareable, bookmarkable and navigable with the back button.
 */
export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mục cài đặt"
      className="flex gap-1 overflow-x-auto rounded-lg bg-secondary p-1 scrollbar-thin"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none",
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
