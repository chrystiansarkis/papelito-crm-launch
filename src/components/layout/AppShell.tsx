// Mitigates: A01 (filtro de itens por papel é defesa em profundidade; fonte de
// verdade é a RLS no Postgres ao consultar os dados protegidos por cada tela)
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Sidebar, SIDEBAR_BASE_NAV } from "./Sidebar";
import { TopBar } from "./TopBar";

const PAPEL_LABEL: Record<string, string> = {
  vendedor: "Vendedor",
  gestor: "Gestor",
  trade: "Trade",
  ceo: "CEO",
  admin: "Admin",
  cobranca: "Cobrança",
};

const SIDEBAR_COLLAPSED_KEY = "sidebar:collapsed";

export function AppShell() {
  const { data: user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });
  const location = useLocation();

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  // Fecha drawer ao mudar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Trava scroll quando drawer está aberto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

  const items = user
    ? SIDEBAR_BASE_NAV.filter((item) => item.roles.includes(user.papel))
    : [];

  return (
    <div className="h-screen flex flex-col bg-paper text-ink overflow-hidden">
      <TopBar
        userName={user?.nome ?? ""}
        userRole={user ? PAPEL_LABEL[user.papel] ?? user.papel : ""}
        onOpenMenu={() => setMobileOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar desktop (lg+) — sempre visível */}
        <div className="hidden lg:block shrink-0">
          <Sidebar
            items={items}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          />
        </div>

        {/* Sidebar mobile (drawer) */}
        {mobileOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-ink/40 z-40 animate-fade-in"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div
              className={cn(
                "lg:hidden fixed top-0 left-0 bottom-0 z-50 animate-slide-in-left"
              )}
            >
              <div className="relative h-full">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-gray-soft z-10"
                  aria-label="Fechar menu"
                >
                  <X className="w-4 h-4" strokeWidth={1.8} />
                </button>
                <Sidebar items={items} onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto bg-paper">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
