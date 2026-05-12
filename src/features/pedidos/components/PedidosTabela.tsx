// Mitigates: A05 (sem HTML inline vindo de dados; interpolação React)
import { Pill, type PillVariant } from "@/components/common/Pill";
import { formatMoney, formatDate } from "@/lib/format";
import { LoadingRow, EmptyRow } from "@/components/common/LoadingRow";
import type { Pedido, PedidoStatus } from "../types";
import { PEDIDO_STATUS_LABEL, PEDIDO_FONTE_LABEL } from "../types";

const STATUS_VARIANT: Record<PedidoStatus, PillVariant> = {
  rascunho: "outline",
  enviado: "soft",
  aprovado: "soft",
  pendente: "warn",
  bloqueado: "risk",
  faturado: "healthy",
  recusado: "risk",
  ruptura: "warn",
  outro: "missing",
};

function fonteLabel(f: string): string {
  if (f === "PROTHEUS" || f === "SALESFORCE") return PEDIDO_FONTE_LABEL[f];
  return f;
}

export type PedidosTabelaProps = {
  rows: Pedido[];
  loading: boolean;
};

export function PedidosTabela({ rows, loading }: PedidosTabelaProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Nº</th>
            <th className="text-left px-4 py-2 font-medium">Cliente</th>
            <th className="text-left px-4 py-2 font-medium">Vendedor</th>
            <th className="text-left px-4 py-2 font-medium">Fonte</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-right px-4 py-2 font-medium">Itens</th>
            <th className="text-right px-4 py-2 font-medium">Total</th>
            <th className="text-left px-4 py-2 font-medium">Data</th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={8} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={8} message="Nenhum pedido encontrado" />
          )}
          {!loading &&
            rows.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/50">
                <td className="px-4 py-2 font-mono text-xs">{p.numero}</td>
                <td className="px-4 py-2 font-medium">
                  {p.cliente_nome ?? "—"}
                </td>
                <td className="px-4 py-2">{p.vendedor_nome ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {fonteLabel(p.fonte)}
                </td>
                <td className="px-4 py-2">
                  <Pill variant={STATUS_VARIANT[p.status] ?? "soft"}>
                    {PEDIDO_STATUS_LABEL[p.status] ?? p.status_raw ?? "—"}
                  </Pill>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {p.itens_count.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatMoney(p.total)}
                </td>
                <td className="px-4 py-2">{formatDate(p.data_pedido)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
