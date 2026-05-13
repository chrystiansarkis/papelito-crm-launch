// Mitigates: A05 (sem HTML inline vindo de dados — interpolacao React),
//            A10 (erros do supabase mostram ErrorState; sem detalhes)
//
// Tabela "Meus orcamentos" — le de public.vw_orcamentos.
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Pill, type PillVariant } from "@/components/common/Pill";
import { formatMoney, formatDate } from "@/lib/format";
import { LoadingRow, EmptyRow } from "@/components/common/LoadingRow";
import {
  ORCAMENTO_STATUS_LABEL,
  type Orcamento,
  type OrcamentoStatus,
} from "../types";

const STATUS_VARIANT: Record<OrcamentoStatus, PillVariant> = {
  rascunho: "outline",
  ruptura: "warn",
  enviado: "soft",
  aguardando_aprovacao: "warn",
  aprovado: "healthy",
  recusado: "risk",
};

export type MeusOrcamentosTabelaProps = {
  rows: Orcamento[];
  loading: boolean;
};

export function MeusOrcamentosTabela({ rows, loading }: MeusOrcamentosTabelaProps) {
  const navigate = useNavigate();
  return (
    <div className="bg-white border border-gray-line rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-soft">
          <tr>
            <Th className="min-w-[140px]">Nº</Th>
            <Th className="min-w-[220px]">Cliente</Th>
            <Th>Status</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Atualizado</Th>
            <Th className="text-right">Criado</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={6} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={6} message="Nenhum orcamento encontrado" />
          )}
          {!loading &&
            rows.map((o) => (
              <tr
                key={o.id}
                onClick={() => navigate(`/pedidos/${o.id}/editar`)}
                className="border-b border-gray-line transition-colors hover:bg-gray-soft cursor-pointer"
              >
                <td className="px-3 py-2.5 font-mono text-[12px] text-ink">{o.numero}</td>
                <td className="px-3 py-2.5 text-[12.5px] text-ink">
                  {o.cliente_nome ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <Pill variant={STATUS_VARIANT[o.status] ?? "soft"}>
                    {ORCAMENTO_STATUS_LABEL[o.status]}
                  </Pill>
                </td>
                <td className={cn("px-3 py-2.5 text-right text-[12.5px] tabular text-ink font-medium whitespace-nowrap")}>
                  {formatMoney(o.total)}
                </td>
                <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-gray-text whitespace-nowrap">
                  {formatDate(o.updated_at)}
                </td>
                <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-gray-text whitespace-nowrap">
                  {formatDate(o.created_at)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-2.5 text-left label-caps text-gray-text", className)}>
      {children}
    </th>
  );
}
