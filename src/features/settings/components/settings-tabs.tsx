"use client";

import { Link } from "@/components/common/link";
import { usePathname } from "next/navigation";
import { BotIcon, BuildingIcon, KeyRoundIcon, QrCodeIcon, WifiIcon } from "lucide-react";

import { houseConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/settings", label: "Nhà trọ", icon: BuildingIcon },
  { href: "/admin/settings/payments", label: "Nhận tiền", icon: QrCodeIcon },
  { href: "/admin/settings/wifi", label: "Wifi", icon: WifiIcon },
  { href: "/admin/settings/account", label: "Tài khoản", icon: KeyRoundIcon },
  // Cờ ở config, không phải biến môi trường: cờ quyết định tab có HIỆN không,
  // env quyết định nó có CHẠY không. Bật cờ mà chưa điền env thì trang hiện
  // checklist thiết lập — giống hệt /admin/gate.
  ...(houseConfig.features.assistant
    ? [{ href: "/admin/settings/integrations", label: "Trợ lý", icon: BotIcon }]
    : []),
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
