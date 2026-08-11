"use client";

import { usePathname } from "next/navigation";

import { Link, LinkPendingDot } from "@/components/common/link";

import { TENANT_NAV, isActive } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/**
 * Bottom tab bar — the tenant side is used almost entirely on phones.
 *
 * Fixed to the viewport bottom, so the page body carries matching padding to
 * keep its last element from hiding underneath.
 */
export function TenantBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm pb-safe"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {TENANT_NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-5", active && "stroke-[2.25]")} />
                <span className="flex items-center gap-1">
                  <span className="truncate">{item.label}</span>
                  {/* Ngón tay che mất tab vừa chạm; chấm này nằm ngay cạnh nhãn
                      nên vẫn thấy được phản hồi mà không cần nhìn lên đầu màn hình. */}
                  <LinkPendingDot className="size-1 shrink-0" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
