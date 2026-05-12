import { KpiCard } from "@/components/common/KpiCard";
import { formatMoney } from "@/lib/format";
import type { InicioKpis as Kpis } from "../types";

export function InicioKpis({ kpis }: { kpis: Kpis }) {
  const temAnterior = (kpis.faturamento_mes_anterior ?? 0) > 0;
  const deltaMes = temAnterior
    ? ((kpis.faturamento_mes_corrente - kpis.faturamento_mes_anterior) /
        kpis.faturamento_mes_anterior) *
      100
    : 0;
  const subDelta = temAnterior
    ? `${deltaMes >= 0 ? "↑" : "↓"} ${Math.abs(deltaMes).toFixed(1)}% vs mês anterior`
    : "—";
  const subColor = temAnterior
    ? deltaMes >= 0
      ? "text-green-600"
      : "text-red-600"
    : undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="Mês corrente"
        value={formatMoney(kpis.faturamento_mes_corrente)}
        sub={subDelta}
        subClass={subColor}
      />
      <KpiCard
        label="Pedidos no mês"
        value={kpis.pedidos_mes_corrente.toLocaleString("pt-BR")}
      />
      <KpiCard
        label="Inadimplência"
        value={formatMoney(kpis.inadimplencia_total)}
        sub={`${kpis.clientes_inadimplentes} cliente(s)`}
        alert={kpis.inadimplencia_total > 0}
      />
      <KpiCard
        label="Em risco"
        value={kpis.clientes_em_risco.toLocaleString("pt-BR")}
        sub="clientes"
        alert={kpis.clientes_em_risco > 0}
      />
    </div>
  );
}
