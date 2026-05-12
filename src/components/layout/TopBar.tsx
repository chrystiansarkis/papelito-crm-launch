import { useEffect, useState } from "react";
import { Bell, Command, Menu, Search, ShieldCheck, X } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { ProgressBar } from "@/components/common/ProgressBar";

export type TopBarProps = {
  userName: string;
  userRole: string;
  onOpenMenu: () => void;
  /**
   * Meta do mês em % (0-100). Placeholder do Figma até existir hook real.
   */
  metaMonth?: number;
};

export function TopBar({ userName, userRole, onOpenMenu, metaMonth = 87 }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Atalho ⌘K / Ctrl+K (placeholder visual — não dispara nenhuma ação real ainda)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="h-14 bg-paper border-b border-gray-line flex items-center justify-between px-4 sm:px-6 gap-3 sm:gap-5 shrink-0">
      {/* Esquerda: hamburger (mobile) + logo */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          className="lg:hidden p-1.5 -ml-1 rounded-md hover:bg-gray-soft transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5 text-ink-soft" strokeWidth={1.8} />
        </button>

        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-[26px] h-[26px] bg-ink rounded flex items-end justify-end p-0.5 shrink-0">
            <div className="w-2 h-2 bg-brand rounded-full" />
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-display text-[19px] font-semibold text-ink leading-none">
              Papelito
            </span>
            <span className="text-[14px] text-gray-faint hidden sm:inline truncate">
              / Comercial
            </span>
          </div>
        </div>
      </div>

      {/* Centro: busca (md+) */}
      <div className="hidden md:flex relative items-center flex-1 max-w-[320px]">
        <Search className="absolute left-3 w-4 h-4 text-gray-faint" strokeWidth={1.8} />
        <input
          type="search"
          placeholder="Buscar cliente, pedido, vendedor… ou perguntar"
          className="w-full pl-9 pr-14 py-1.5 bg-gray-soft border border-transparent rounded-md text-[13px] placeholder:text-gray-faint focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
        />
        <div className="absolute right-3 flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-gray-line rounded text-[10px] text-gray-text font-medium">
          <Command className="w-2.5 h-2.5" strokeWidth={2} />
          <span>K</span>
        </div>
      </div>

      {/* Busca overlay mobile (ativada via ⌘K) */}
      {searchOpen && (
        <div className="md:hidden absolute left-0 right-0 top-0 h-14 bg-paper border-b border-gray-line flex items-center px-4 gap-2 z-30">
          <Search className="w-4 h-4 text-gray-faint" strokeWidth={1.8} />
          <input
            autoFocus
            type="search"
            placeholder="Buscar..."
            className="flex-1 bg-transparent text-[13px] focus:outline-none placeholder:text-gray-faint"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="p-1.5 rounded-md hover:bg-gray-soft"
            aria-label="Fechar busca"
          >
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* Direita: meta + aprovações + notif + user */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        {/* Meta do mês (lg+ só) — placeholder até existir hook real */}
        <div className="hidden lg:flex flex-col gap-1 min-w-[120px]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-gray-text font-medium">Meta mês</span>
            <span className="text-[12.5px] text-ink font-semibold tabular">
              {metaMonth}%
            </span>
          </div>
          <ProgressBar value={metaMonth} variant="brand" height={3} />
        </div>

        {/* Busca mobile (xs/sm) — ícone */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="md:hidden p-1.5 rounded-md hover:bg-gray-soft transition-colors"
          aria-label="Buscar"
        >
          <Search className="w-5 h-5 text-ink-soft" strokeWidth={1.8} />
        </button>

        <button
          type="button"
          className="relative p-1.5 hover:bg-gray-soft rounded-md transition-colors"
          aria-label="Aprovações"
        >
          <ShieldCheck className="w-5 h-5 text-ink-soft" strokeWidth={1.8} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-bad rounded-full border border-paper" />
        </button>

        <button
          type="button"
          className="relative p-1.5 hover:bg-gray-soft rounded-md transition-colors"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5 text-ink-soft" strokeWidth={1.8} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-bad rounded-full border border-paper" />
        </button>

        <div className="flex items-center gap-2.5">
          <Avatar name={userName} size={28} />
          <div className="hidden sm:flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-[12.5px] text-ink font-medium truncate max-w-[140px]">
                {userName}
              </span>
              <span className="text-[12.5px] text-gray-faint hidden md:inline">/</span>
              <span className="text-[12.5px] text-gray-text hidden md:inline truncate max-w-[140px]">
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
