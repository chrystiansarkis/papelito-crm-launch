import { KpiCard } from "@/components/common/KpiCard";
import { formatMoney } from "@/lib/format";
import type { CobrancaKpis } from "../types";

export function KpisCarteira({ kpis }: { kpis: CobrancaKpis | null | undefined }) {
  const pctVencido = Number(kpis?.pct_vencido ?? 0);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Carteira aberta" value={formatMoney(kpis?.carteira_aberta ?? 0)} />
        <KpiCard
          label="Carteira vencida"
          value={formatMoney(kpis?.carteira_vencida ?? 0)}
          valueClass="text-red-600"
        />
        <KpiCard
          label="% vencido"
          value={`${pctVencido.toFixed(1)}%`}
          valueClass={pctVencido > 50 ? "text-red-600" : ""}
        />
        <KpiCard label="DSO 12m" value={`${kpis?.dso_dias ?? 0} dias`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AgingKpi label="1–30 dias" value={kpis?.vencido_1_30 ?? 0} color="#F5C518" />
        <AgingKpi label="31–90 dias" value={kpis?.vencido_31_90 ?? 0} color="#F59E0B" />
        <AgingKpi label="91+ dias" value={kpis?.vencido_91_mais ?? 0} color="#EF4444" />
      </div>
    </>
  );
}

function AgingKpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="border border-border rounded-lg p-3 bg-card border-l-4"
      style={{ borderLeftColor: color }}
    >
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-display mt-0.5 tabular-nums">{formatMoney(value)}</div>
    </div>
  );
}
