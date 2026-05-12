import { Columns3, Grid3x3, MapPin, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "kanban" | "map";

const MODES: { id: ViewMode; label: string; icon: LucideIcon }[] = [
  { id: "table", label: "Tabela", icon: Grid3x3 },
  { id: "kanban", label: "Kanban RFV", icon: Columns3 },
  { id: "map", label: "Mapa", icon: MapPin },
];

export function ViewToggle({
  active,
  onChange,
}: {
  active: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-1 bg-gray-soft border border-gray-line rounded-md p-1"
    >
      {MODES.map((m) => {
        const isActive = active === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(m.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all",
              isActive
                ? "bg-white text-ink shadow-sm"
                : "text-gray-text hover:text-ink"
            )}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
