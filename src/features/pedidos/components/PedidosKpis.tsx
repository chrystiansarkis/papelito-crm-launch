import { KpiCard } from "@/components/common/KpiCard";
import { formatMoney } from "@/lib/format";
import type { PedidosKpis as Kpis } from "../types";

export function PedidosKpis({ kpis }: { kpis: Kpis | undefined }) {
  const total = kpis?.total ?? 0;
  const valor = kpis?.valor_total ?? 0;
  const pendentes = kpis?.pendentes ?? 0;
  const faturadosMes = kpis?.faturados_mes ?? 0;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="Total de pedidos" value={total.toLocaleString("pt-BR")} />
      <KpiCard label="Valor total" value={formatMoney(valor)} />
      <KpiCard
        label="Pendentes"
        value={pendentes.toLocaleString("pt-BR")}
        alert={pendentes > 0}
      />
      <KpiCard
        label="Faturados no mês"
        value={faturadosMes.toLocaleString("pt-BR")}
      />
    </div>
  );
}
