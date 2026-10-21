import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { getUser } from "@/lib/dal";
import { logout } from "@/lib/auth-actions";

const BRAND = process.env.CLIENT_NAME ?? "Portal SAP";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      {/* Fallback sem usePathname: rotas dinâmicas não têm pathname no prerender. */}
      <Suspense fallback={<aside className="fixed inset-y-0 left-0 hidden w-64 bg-sidebar md:block" />}>
        <SessionSidebar />
      </Suspense>
      <div className="md:pl-64">
        <header className="flex h-16 items-center justify-end gap-4 border-b border-border bg-surface px-6">
          <Suspense fallback={<span className="h-4 w-32 animate-pulse rounded bg-border" />}>
            <UserMenu />
          </Suspense>
        </header>
        {/* Cada rota tem seu loading.tsx (Suspense automático do Next). */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

async function SessionSidebar() {
  const user = await getUser();
  return <Sidebar brand={BRAND} isAdmin={user.role === "admin"} />;
}

async function UserMenu() {
  const user = await getUser();
  return (
    <>
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <span className="hidden text-sm leading-tight sm:block">
          <span className="block font-medium">{user.name}</span>
          <span className="block text-xs text-muted">{user.email}</span>
        </span>
      </div>
      <form action={logout}>
        <button className="btn-secondary px-3 py-1.5" aria-label="Sair">
          <LogOut size={16} /> Sair
        </button>
      </form>
    </>
  );
}

