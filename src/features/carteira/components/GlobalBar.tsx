import { Plus, Star } from "lucide-react";
import { Chip } from "@/components/common/Chip";
import { AppButton } from "@/components/common/AppButton";
import { formatMoney } from "@/lib/format";

export type GlobalBarFilter = { label: string; value: string };
export type SavedView = { name: string; starred?: boolean };
export type GlobalBarMetrics = {
  count: number;
  countLabel?: string;
  ytd?: string | number | null;
  avgTicket?: string | number | null;
};

export type GlobalBarProps = {
  filters?: GlobalBarFilter[];
  savedViews?: SavedView[];
  metrics: GlobalBarMetrics;
  onSaveView?: () => void;
  onAddView?: () => void;
};

const DEFAULT_FILTERS: GlobalBarFilter[] = [
  { label: "Vendedor", value: "Todos" },
  { label: "Região", value: "Todas" },
  { label: "Estado", value: "Todos" },
  { label: "Tipo", value: "Todos" },
  { label: "Programa", value: "Todos" },
  { label: "Saúde", value: "Todas" },
  { label: "RFV", value: "Todos" },
  { label: "Período", value: String(new Date().getFullYear()) },
];

const DEFAULT_VIEWS: SavedView[] = [
  { name: "Minha carteira", starred: true },
  { name: "Top 20 fatur." },
  { name: "Em queda crítica" },
  { name: "Distrib. tier A" },
];

function formatMaybeMoney(v: string | number | null | undefined): string | null {
  if (v == null) return null;
  if (typeof v === "number") return formatMoney(v);
  return v;
}

export function GlobalBar({
  filters = DEFAULT_FILTERS,
  savedViews = DEFAULT_VIEWS,
  metrics,
  onSaveView,
  onAddView,
}: GlobalBarProps) {
  const ytdStr = formatMaybeMoney(metrics.ytd);
  const ticketStr = formatMaybeMoney(metrics.avgTicket);
  const countLabel = metrics.countLabel ?? "clientes";

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-line px-4 sm:px-6 lg:px-7 py-3.5 space-y-3">
      {/* Linha 1: Filtros + Salvar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="label-caps text-gray-text mr-1">Filtros</span>
          {filters.map((f, i) => (
            <Chip key={`${f.label}-${i}`} variant="default" hasDropdown>
              {f.label}: {f.value}
            </Chip>
          ))}
        </div>
        <AppButton variant="link" onClick={onSaveView}>
          Salvar visão
        </AppButton>
      </div>

      {/* Linha 2: Visões salvas + métricas */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="label-caps text-gray-text mr-1">Visões</span>
          {savedViews.map((v) => (
            <Chip key={v.name} variant="saved">
              {v.starred && (
                <Star className="w-3 h-3 fill-brand-deep text-brand-deep" strokeWidth={0} />
              )}
              {v.name}
            </Chip>
          ))}
          <button
            type="button"
            onClick={onAddView}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-line text-gray-text hover:border-brand hover:text-brand hover:bg-brand-soft/30 transition-all"
            aria-label="Adicionar visão"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-text tabular">
          <span className="font-semibold text-ink">
            {metrics.count.toLocaleString("pt-BR")} {countLabel}
          </span>
          {ytdStr && (
            <>
              <span className="text-gray-line">·</span>
              <span>{ytdStr} YTD</span>
            </>
          )}
          {ticketStr && (
            <>
              <span className="text-gray-line">·</span>
              <span>ticket médio {ticketStr}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
