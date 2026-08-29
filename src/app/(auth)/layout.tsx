import { BrandLockup } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-accent/40 to-background">

      <div className="flex items-center justify-between px-4 py-4">
        <BrandLockup labelClassName="text-sm" />
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm animate-slide-up">{children}</div>
      </main>
    </div>
  );
}
