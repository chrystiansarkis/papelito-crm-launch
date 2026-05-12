// Mitigates: A05 (sem HTML inline vindo de dados; interpolação React)
import { cn } from "@/lib/utils";
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
    <div className="bg-white border border-gray-line rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-soft">
          <tr>
            <Th className="min-w-[120px]">Nº</Th>
            <Th className="min-w-[200px]">Cliente</Th>
            <Th className="min-w-[160px]">Vendedor</Th>
            <Th>Fonte</Th>
            <Th>Status</Th>
            <Th className="text-right">Itens</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Data</Th>
          </tr>
        </thead>

        <tbody>
          {loading && <LoadingRow colSpan={8} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={8} message="Nenhum pedido encontrado" />
          )}
          {!loading &&
            rows.map((p) => (
              <tr
                key={p.id}
                className="border-b border-gray-line transition-colors hover:bg-gray-soft"
              >
                <td className="px-3 py-2.5 font-mono text-[12px] text-ink">
                  {p.numero}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[12.5px] font-medium text-ink">
                    {p.cliente_nome ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[12.5px] text-ink">
                  {p.vendedor_nome ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-[11px] text-gray-text">
                  {fonteLabel(p.fonte)}
                </td>
                <td className="px-3 py-2.5">
                  <Pill variant={STATUS_VARIANT[p.status] ?? "soft"}>
                    {PEDIDO_STATUS_LABEL[p.status] ?? p.status_raw ?? "—"}
                  </Pill>
                </td>
                <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink">
                  {p.itens_count.toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink font-medium whitespace-nowrap">
                  {formatMoney(p.total)}
                </td>
                <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-gray-text whitespace-nowrap">
                  {formatDate(p.data_pedido)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn("px-3 py-2.5 text-left label-caps text-gray-text", className)}
    >
      {children}
    </th>
  );
}
