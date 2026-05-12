import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Home, Briefcase, ShoppingCart, Megaphone, UserPlus, Wallet,
  BarChart3, Map, Award, Settings, Bell, Search, LogOut, User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/lib/supabase";
import type { Papel } from "@/lib/database.types";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: typeof Home; roles: Papel[] };

const NAV: NavItem[] = [
  { to: "/",          label: "Início",        icon: Home,        roles: ["vendedor","gestor","trade","ceo","admin","cobranca"] },
  { to: "/carteira",  label: "Carteira",      icon: Briefcase,   roles: ["vendedor","gestor","trade","ceo","admin"] },
  { to: "/pedidos",   label: "Pedidos",       icon: ShoppingCart,roles: ["vendedor","ceo"] },
  { to: "/campanhas", label: "Campanhas",     icon: Megaphone,   roles: ["trade","ceo"] },
  { to: "/leads",     label: "Leads",         icon: UserPlus,    roles: ["trade","vendedor"] },
  { to: "/cobranca",  label: "Cobrança",      icon: Wallet,      roles: ["cobranca","ceo"] },
  { to: "/analise",   label: "Análise",       icon: BarChart3,   roles: ["ceo","trade"] },
  { to: "/rotas",     label: "Rotas",         icon: Map,         roles: ["vendedor"] },
  { to: "/programas", label: "Programas",     icon: Award,       roles: ["trade","ceo"] },
  { to: "/config",    label: "Configurações", icon: Settings,    roles: ["admin"] },
];

export function AppShell() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState("");

  const items = user ? NAV.filter((i) => i.roles.includes(user.papel)) : [];

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const initials = user?.nome
    ? user.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "?";

  return (
    <div className="min-h-screen flex bg-paper text-ink">
      <aside className="w-60 border-r border-border bg-card flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow" />
          <span className="font-display text-lg">Papelito</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-md border-l-2 border-transparent transition-colors",
                  isActive
                    ? "bg-yellow-50 border-yellow font-medium text-ink"
                    : "text-muted-foreground hover:bg-muted hover:text-ink"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar... (⌘K)"
              className="w-full h-9 pl-9 pr-3 text-sm rounded-md bg-muted border border-transparent focus:bg-card focus:border-border focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-md hover:bg-muted text-muted-foreground" aria-label="Notificações">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-yellow opacity-0" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-yellow text-ink text-xs font-medium flex items-center justify-center hover:opacity-90">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs">
                  <div className="font-medium truncate">{user?.nome}</div>
                  <div className="text-muted-foreground truncate">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="w-4 h-4 mr-2" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}