import { KpiCard } from "@/components/common/KpiCard";
import { formatMoney, formatDate } from "@/lib/format";
import type { ClienteFicha } from "../types";

export function ClienteKpis({ cliente }: { cliente: ClienteFicha }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="Faturamento 12m" value={formatMoney(cliente.faturamento_12m)} />
      <KpiCard label="Ticket médio" value={formatMoney(cliente.ticket_medio_12m)} />
      <KpiCard
        label="Última compra"
        value={formatDate(cliente.data_ultima_compra)}
        sub={cliente.dias_sem_compra != null ? `há ${cliente.dias_sem_compra} dias` : null}
      />
      <KpiCard
        label="Em aberto"
        value={formatMoney(cliente.total_aberto)}
        sub={cliente.total_vencido > 0 ? `${formatMoney(cliente.total_vencido)} vencido` : null}
        alert={cliente.total_vencido > 0}
      />
    </div>
  );
}
