// Mitigates: A05 (sem HTML inline vindo de dados; interpolação React)
//
// PedidosTabela: agora consome public.vw_pedidos_enriched. Cada linha tem
// dados do cliente (uf, saude, tier, score) sem nova request — usamos isso
// para mostrar bandeirinhas contextuais que ajudam o vendedor a priorizar.
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ExternalLink, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill, type PillVariant } from "@/components/common/Pill";
import { StatusDot } from "@/components/common/StatusDot";
import { formatMoney, formatDate } from "@/lib/format";
import { LoadingRow, EmptyRow } from "@/components/common/LoadingRow";
import { saudeToStatus } from "@/features/carteira/lib/mapSaude";
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
  if (f === "PROTHEUS" || f === "SALESFORCE" || f === "SANKHYA") {
    return PEDIDO_FONTE_LABEL[f as keyof typeof PEDIDO_FONTE_LABEL];
  }
  return f;
}

export type PedidosTabelaProps = {
  rows: Pedido[];
  loading: boolean;
};

export function PedidosTabela({ rows, loading }: PedidosTabelaProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-gray-line rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-soft">
          <tr>
            <Th className="min-w-[110px]">Nº</Th>
            <Th>Saúde</Th>
            <Th className="min-w-[200px]">Cliente</Th>
            <Th>UF</Th>
            <Th>Tipo</Th>
            <Th className="min-w-[140px]">Vendedor</Th>
            <Th>Fonte</Th>
            <Th>Status</Th>
            <Th className="text-center">Sinais</Th>
            <Th className="text-right">Itens</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">Data</Th>
          </tr>
        </thead>

        <tbody>
          {loading && <LoadingRow colSpan={12} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={12} message="Nenhum pedido encontrado" />
          )}
          {!loading &&
            rows.map((p) => {
              const saude = saudeToStatus(p.cliente_saude);
              const tipo = p.cliente_tipo
                ? p.cliente_tipo.charAt(0).toUpperCase() + p.cliente_tipo.slice(1)
                : null;
              const venc = p.cliente_total_vencido;
              const acordo = p.cliente_tem_acordo;

              return (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/pedido/${p.id}`)}
                  className="border-b border-gray-line transition-colors hover:bg-gray-soft cursor-pointer"
                >
                  <td className="px-3 py-2.5 font-mono text-[12px] text-ink">{p.numero}</td>
                  <td className="px-3 py-2.5">
                    {p.cliente_saude ? <StatusDot status={saude} /> : <span className="text-gray-faint">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {p.cliente_id && p.cliente_nome ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/cliente/${p.cliente_id}`);
                        }}
                        className="flex flex-col items-start text-left group"
                        title="Ir para o cliente"
                      >
                        <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink group-hover:text-brand transition-colors">
                          {p.cliente_nome}
                          <ExternalLink
                            className="w-3 h-3 opacity-0 group-hover:opacity-60"
                            strokeWidth={2.2}
                          />
                        </span>
                        {p.cliente_cidade && (
                          <span className="text-[11px] text-gray-text">{p.cliente_cidade}</span>
                        )}
                      </button>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-[12.5px] font-medium text-ink">
                          {p.cliente_nome ?? "—"}
                        </span>
                        {p.cliente_cidade && (
                          <span className="text-[11px] text-gray-text">{p.cliente_cidade}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] tabular text-ink">
                    {p.cliente_uf ?? <span className="text-gray-faint">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {tipo ? (
                      <Pill variant="soft">{tipo}</Pill>
                    ) : (
                      <span className="text-gray-faint text-[12.5px]">—</span>
                    )}
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
                  <td className="px-3 py-2.5 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      {venc > 0 && (
                        <span
                          title={`Inadimplência ${formatMoney(venc)}`}
                          className="inline-flex items-center text-bad"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.2} />
                        </span>
                      )}
                      {acordo && (
                        <span title="Acordo de cobrança ativo" className="inline-flex items-center text-good">
                          <Handshake className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                      )}
                      {p.cliente_score && (
                        <span
                          title={`Score pagamento: ${p.cliente_score}`}
                          className={cn(
                            "text-[11px] font-bold tabular",
                            p.cliente_score === "A" || p.cliente_score === "B"
                              ? "text-good"
                              : p.cliente_score === "C"
                                ? "text-warn"
                                : "text-bad",
                          )}
                        >
                          {p.cliente_score}
                        </span>
                      )}
                      {!venc && !acordo && !p.cliente_score && (
                        <span className="text-gray-faint text-[11px]">—</span>
                      )}
                    </div>
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
              );
            })}
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
    <th className={cn("px-3 py-2.5 text-left label-caps text-gray-text", className)}>
      {children}
    </th>
  );
}
