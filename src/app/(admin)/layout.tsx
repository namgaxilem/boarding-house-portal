import { requireAdmin } from "@/lib/auth/dal";
import { AdminMobileNav, AdminSidebar } from "@/components/layout/admin-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/common/theme";

// Note: no `loading.tsx` anywhere in this tree. On Next 16.2 + Turbopack a
// route-level loading boundary over a dynamic segment leaves the fallback stuck
// on screen — the content never swaps in. Pages that need streaming use an
// explicit <Suspense> instead, which works correctly (see /admin).

// Vào /admin từ ngoài luôn phải chờ `requireAdmin()` — đó là guard bảo mật, không
// được stream sau shell, nếu không nội dung admin đã bay ra trước khi redirect.
// Nên layout này được phép block; các page bên trong vẫn được kiểm tra instant khi
// điều hướng qua lại trong /admin.
export const instant = false;

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The real guard. proxy.ts only does an optimistic check that a determined
  // caller can bypass; this runs on the server for every admin render.
  const user = await requireAdmin();

  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">

        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur">
          <AdminMobileNav />
          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu user={user} />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
