import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoneyShort } from "@/lib/format";
import { formatMilhar, type TendenciaAgg } from "../../lib/carteiraKpis";
import type { CarteiraFilter } from "../../types";

type CardProps = {
  Icon: typeof TrendingUp;
  iconClass: string;
  label: string;
  count: number;
  pct: number;
  valor: string;
  hint: string;
  active: boolean;
  onClick: () => void;
};

function Card({ Icon, iconClass, label, count, pct, valor, hint, active, onClick }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border border-gray-line rounded-lg bg-card p-3 text-left transition",
        active ? "ring-2 ring-brand bg-brand-soft" : "hover:bg-gray-soft",
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
          <Icon className={cn("w-3.5 h-3.5", iconClass)} strokeWidth={2.25} />
          {label}
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="text-[20px] font-medium tabular text-ink">
            {formatMilhar(count)}
          </span>{" "}
          <span className="text-[11px] text-gray-faint">
            {pct.toFixed(1).replace(".", ",")}%
          </span>
        </div>
        <div className="font-mono text-[12px] font-medium tabular text-ink">{valor}</div>
      </div>
      <div className="text-[10px] text-gray-faint mt-1">{hint}</div>
    </button>
  );
}

export type CardsTendenciaProps = {
  agg: TendenciaAgg;
  filter: CarteiraFilter;
  onToggleCrescendo: () => void;
  onToggleCaindo: () => void;
  onToggleVencido: () => void;
};

export function CardsTendencia({
  agg,
  filter,
  onToggleCrescendo,
  onToggleCaindo,
  onToggleVencido,
}: CardsTendenciaProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Card
        Icon={TrendingUp}
        iconClass="text-good"
        label="Crescendo"
        count={agg.crescendo.count}
        pct={agg.crescendo.pct}
        valor={formatMoneyShort(agg.crescendo.tendencia_total)}
        hint="tendência 2026 desses clientes"
        active={filter.tendencia === "crescendo"}
        onClick={onToggleCrescendo}
      />
      <Card
        Icon={TrendingDown}
        iconClass="text-bad"
        label="Caindo"
        count={agg.caindo.count}
        pct={agg.caindo.pct}
        valor={formatMoneyShort(agg.caindo.tendencia_total)}
        hint="tendência 2026 desses clientes"
        active={filter.tendencia === "caindo"}
        onClick={onToggleCaindo}
      />
      <Card
        Icon={AlertTriangle}
        iconClass="text-warn"
        label="Com vencido"
        count={agg.vencido.count}
        pct={agg.vencido.pct}
        valor={formatMoneyShort(agg.vencido.valor_total)}
        hint="saldo aberto em atraso"
        active={filter.vencido}
        onClick={onToggleVencido}
      />
    </div>
  );
}