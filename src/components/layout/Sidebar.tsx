// Mitigates: A01 (papeis vêm de useCurrentUser; filtragem por papel é defesa em
// profundidade — a fonte de verdade continua sendo RLS no banco)
import { NavLink, useLocation } from "react-router-dom";
import {
  Award,
  BarChart3,
  Boxes,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  Gift,
  Home,
  MapPin,
  Megaphone,
  Package,
  Percent,
  Plus,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavBadge, type NavBadgeVariant } from "@/components/common/NavBadge";
import type { Papel } from "@/types/database";

export type NavItemConfig = {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: { value: number; variant: NavBadgeVariant };
  roles: Papel[];
  // Separador acima deste item
  separatorBefore?: boolean;
};

export type SidebarProps = {
  items: NavItemConfig[];
  onNavigate?: () => void; // útil para fechar drawer no mobile
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function Sidebar({ items, onNavigate, collapsed = false, onToggleCollapsed }: SidebarProps) {
  // Preserva o query string entre navegações de sidebar — os filtros globais
  // vivem na URL (?vendedor=X&uf=Y), então trocar /carteira → /pedidos deve
  // manter o recorte.
  const location = useLocation();

  return (
    <aside
      className={cn(
        "h-full bg-paper border-r border-gray-line flex flex-col transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      <nav
        className={cn(
          "flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden",
          collapsed ? "px-2" : "px-3"
        )}
      >
        {items.map((item, i) => (
          <div key={item.to}>
            {item.separatorBefore && i > 0 && (
              <div className="h-px bg-gray-line my-2" />
            )}
            <NavLink
              to={{ pathname: item.to, search: location.search }}
              end={item.to === "/"}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center w-full rounded-md transition-all cursor-pointer select-none",
                  collapsed
                    ? "justify-center px-2 py-2"
                    : "justify-between px-3 py-2",
                  isActive
                    ? "bg-ink text-white"
                    : "text-ink-soft hover:bg-gray-soft"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      "flex items-center",
                      collapsed ? "" : "gap-2.5"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-[14px] h-[14px] shrink-0",
                        isActive ? "text-white" : "text-ink-soft"
                      )}
                      strokeWidth={1.8}
                    />
                    {!collapsed && (
                      <span className="text-[13px] font-medium">{item.label}</span>
                    )}
                  </div>
                  {item.badge && !collapsed && (
                    <NavBadge
                      variant={isActive ? "brand" : item.badge.variant}
                    >
                      {item.badge.value}
                    </NavBadge>
                  )}
                  {item.badge && collapsed && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1 right-1 w-1.5 h-1.5 rounded-full",
                        item.badge.variant === "alert"
                          ? "bg-bad"
                          : item.badge.variant === "brand"
                          ? "bg-brand"
                          : "bg-gray-text"
                      )}
                    />
                  )}
                </>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "border-t border-gray-line flex flex-col gap-2",
          collapsed ? "p-2" : "p-4"
        )}
      >
        <button
          type="button"
          title={collapsed ? "Nova ação" : undefined}
          className={cn(
            "bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink font-semibold rounded-md transition-all flex items-center justify-center gap-2",
            collapsed ? "w-full p-2" : "w-full px-3.5 py-2"
          )}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          {!collapsed && <span className="text-[12.5px]">Nova ação</span>}
        </button>

        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "hidden lg:flex items-center text-ink-soft hover:bg-gray-soft rounded-md transition-all",
              collapsed
                ? "w-full justify-center p-2"
                : "w-full justify-start gap-2 px-3 py-1.5"
            )}
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4" strokeWidth={1.8} />
            ) : (
              <>
                <ChevronsLeft className="w-4 h-4" strokeWidth={1.8} />
                <span className="text-[12px]">Recolher</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}

export type SidebarNavItem = NavItemConfig;

// Configuração de nav reutilizável (importada pelo AppShell e por testes).
// As contagens de Leads/Rotas/Aprovações são placeholders do Figma até existirem
// hooks reais; Carteira é injetada dinamicamente no AppShell.
export const SIDEBAR_BASE_NAV: NavItemConfig[] = [
  { to: "/", label: "Início", icon: Home, roles: ["vendedor", "gestor", "trade", "ceo", "admin", "cobranca"] },
  { to: "/carteira", label: "Carteira", icon: Users, roles: ["vendedor", "gestor", "trade", "ceo", "admin"] },
  { to: "/pedidos", label: "Pedidos", icon: Package, roles: ["vendedor", "ceo"] },
  { to: "/atendimentos", label: "Atendimentos", icon: CalendarClock, roles: ["vendedor", "gestor", "ceo", "admin"] },
  { to: "/campanhas", label: "Campanhas", icon: Megaphone, roles: ["trade", "ceo"] },
  { to: "/campanhas-vendas", label: "Campanhas Vendas", icon: Award, roles: ["gestor", "ceo", "admin"] },
  { to: "/leads", label: "Leads", icon: Zap, badge: { value: 4, variant: "alert" }, roles: ["trade", "vendedor"] },
  { to: "/analise", label: "Análise", icon: BarChart3, roles: ["ceo", "trade"] },
  { to: "/cobranca", label: "Cobrança", icon: Wallet, roles: ["cobranca", "ceo"] },
  { to: "/rotas", label: "Rotas", icon: MapPin, badge: { value: 2, variant: "brand" }, roles: ["vendedor"] },
  { to: "/aprovacoes", label: "Aprovações", icon: ShieldCheck, badge: { value: 3, variant: "alert" }, roles: ["ceo", "admin"], separatorBefore: true },
  { to: "/programas", label: "Programas", icon: Trophy, roles: ["trade", "ceo"] },
  { to: "/tabelas-preco", label: "Tabelas de preço", icon: Percent, roles: ["admin", "ceo", "gestor"], separatorBefore: true },
  { to: "/admin/produtos", label: "Produtos (caixa master)", icon: Boxes, roles: ["admin", "ceo", "gestor"] },
  { to: "/bonificacao-regras", label: "Regras de bonificação", icon: Gift, roles: ["admin", "ceo", "gestor"] },
  { to: "/config", label: "Configurações", icon: Settings, roles: ["admin"], separatorBefore: true },
];
