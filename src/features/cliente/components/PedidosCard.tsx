import { SectionCard } from "@/components/common/SectionCard";
import { formatMoney, formatDate } from "@/lib/format";
import type { Pedido } from "../types";

export function PedidosCard({ pedidos }: { pedidos: Pedido[] }) {
  return (
    <SectionCard title="Últimos pedidos" subtitle={`${pedidos.length} mostrados`}>
      {pedidos.length === 0 && (
        <div className="text-sm text-muted-foreground">Sem pedidos registrados.</div>
      )}
      {pedidos.length > 0 && (
        <div className="divide-y divide-border">
          {pedidos.map((p) => (
            <div
              key={p.numero_pedido}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">{p.numero_nota ?? p.numero_pedido}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(p.data_negociacao)} · {p.qtd_total} un.
                </div>
              </div>
              <div className="tabular-nums font-medium">
                {formatMoney(p.valor_liquido)}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
