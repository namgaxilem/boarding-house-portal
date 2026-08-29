import { Link } from "@/components/common/link";

import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme";
import { houseConfig, fullAddress } from "@/config/site";

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
            <Button asChild size="sm">
              <Link href="/login">Đăng nhập</Link>
            </Button>
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
