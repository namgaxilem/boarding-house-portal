import { Link } from "@/components/common/link";
import { BuildingIcon } from "lucide-react";

import { ThemeToggle } from "@/components/common/theme";
import { houseConfig } from "@/config/site";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-accent/40 to-background">

      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BuildingIcon className="size-4" />
          </span>
          <span className="truncate text-sm">{houseConfig.name}</span>
        </Link>
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm animate-slide-up">{children}</div>
      </main>
    </div>
  );
}
