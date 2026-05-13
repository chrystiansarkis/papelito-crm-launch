import { useEffect, useRef, useState } from "react";
import { Bell, Menu, Search, ShieldCheck, X } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { ProgressBar } from "@/components/common/ProgressBar";
import { GlobalSearch } from "@/features/shared/search";

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
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K: desktop foca o input central; mobile abre o overlay.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const isDesktop = window.matchMedia("(min-width: 768px)").matches;
        if (isDesktop) {
          const input = desktopSearchRef.current?.querySelector("input");
          input?.focus();
        } else {
          setSearchOpen(true);
        }
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
      <div ref={desktopSearchRef} className="hidden md:block flex-1 max-w-[320px]">
        <GlobalSearch showShortcut />
      </div>

      {/* Busca overlay mobile (ativada via ⌘K ou ícone) */}
      {searchOpen && (
        <div className="md:hidden absolute left-0 right-0 top-0 h-14 bg-paper border-b border-gray-line flex items-center px-4 gap-2 z-30">
          <div className="flex-1">
            <GlobalSearch autoFocus onClose={() => setSearchOpen(false)} />
          </div>
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
