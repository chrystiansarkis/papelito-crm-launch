// Mitigates: A05 (texto exibido como text node React, sem dangerouslySetInnerHTML)
//
// ClientList: agora consome public.vw_cliente_ficha (via listCarteiraClientes),
// que traz KPIs financeiros, score de pagamento, cobrança e variação YoY já
// calculados — não precisamos mais de placeholders "—" nas colunas centrais.
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Handshake, Megaphone, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/common/Pill";
import { StatusDot } from "@/components/common/StatusDot";
import { ProgressBar } from "@/components/common/ProgressBar";
import { LoadingRow, EmptyRow } from "@/components/common/LoadingRow";
import { formatMoney } from "@/lib/format";
import { saudeToStatus } from "../lib/mapSaude";
import type { CarteiraCliente } from "../types";

export type ClientListProps = {
  rows: CarteiraCliente[];
  loading: boolean;
  selected: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
};

function tipoLabel(c: CarteiraCliente): string {
  if (c.em_familia_papelito) return "Família";
  if (c.em_pdv_perfeito) return "PDV Perfeito";
  if ((c.tier ?? "").toLowerCase() === "a") return "Distribuidor";
  if (c.tipo === "distribuidor") return "Distribuidor";
  if (c.tipo === "lojista") return "Lojista";
  return "—";
}

function ageColor(d: number | null): string {
  if (d == null) return "text-gray-faint";
  if (d <= 7) return "text-gray-text";
  if (d <= 30) return "text-warn";
  return "text-bad";
}

const SCORE_TEXT: Record<string, string> = {
  A: "text-good",
  B: "text-good",
  C: "text-warn",
  D: "text-bad",
  E: "text-bad",
};

function yoyVariation(c: CarteiraCliente): { pct: number; sign: 1 | -1 | 0 } | null {
  const prev = c.faturamento_12m_anterior;
  const cur = c.faturamento_12m;
  if (!prev || prev <= 0) return null;
  const delta = (cur - prev) / prev;
  const sign = delta > 0.01 ? 1 : delta < -0.01 ? -1 : 0;
  return { pct: Math.round(delta * 100), sign };
}

function yoyColor(sign: 1 | -1 | 0): string {
  if (sign === 1) return "text-good";
  if (sign === -1) return "text-bad";
  return "text-gray-text";
}

export function ClientList({
  rows,
  loading,
  selected,
  onSelectAll,
  onSelectRow,
}: ClientListProps) {
  const navigate = useNavigate();
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function onRowClick(e: React.MouseEvent, id: string) {
    const target = e.target as HTMLElement;
    if (target.closest("input[type='checkbox']")) return;
    navigate(`/cliente/${id}`);
  }

  return (
    <div className="bg-white border border-gray-line rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-soft">
          <tr>
            <th className="px-3 py-2.5 text-left w-8">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-line cursor-pointer"
                aria-label="Selecionar todos"
              />
            </th>
            <Th>Saúde</Th>
            <Th className="min-w-[180px]">Cliente</Th>
            <Th>Tipo</Th>
            <Th className="text-right">RFV</Th>
            <Th className="text-right">YoY</Th>
            <Th className="text-right">Pedidos 12m</Th>
            <Th className="text-right">Fat. 12m</Th>
            <Th className="text-right">Ticket méd.</Th>
            <Th className="text-right">Sem compra</Th>
            <Th>Vendedor</Th>
            <Th className="text-center">Camp.</Th>
            <Th className="text-right">Vencido</Th>
            <Th className="text-right">Limite %</Th>
            <Th className="text-center">Fin.</Th>
            <Th className="min-w-[140px]">Próxima ação IA</Th>
          </tr>
        </thead>

        <tbody>
          {loading && <LoadingRow colSpan={16} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={16} message="Nenhum cliente encontrado" />
          )}
          {!loading &&
            rows.map((c) => {
              const status = saudeToStatus(c.saude);
              const dias = c.dias_sem_compra;
              const isSel = selected.has(c.id);
              const score = (c.score_pagamento ?? "").toUpperCase();
              const hasCampaign = c.em_familia_papelito || c.em_pdv_perfeito;
              const yoy = yoyVariation(c);
              const venc = c.total_vencido;
              const limPct = c.limite_pct_utilizado;
              const acordo = c.tem_acordo_ativo;

              return (
                <tr
                  key={c.id}
                  onClick={(e) => onRowClick(e, c.id)}
                  className={cn(
                    "border-b border-gray-line transition-colors cursor-pointer",
                    isSel ? "bg-brand-soft/40" : "hover:bg-gray-soft",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => onSelectRow(c.id, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-line cursor-pointer"
                      aria-label={`Selecionar ${c.nome}`}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusDot status={status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-[12.5px] font-medium text-ink">{c.nome}</span>
                      <span className="text-[11px] text-gray-text">
                        {c.cidade ?? "—"}
                        {c.uf ? `, ${c.uf}` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill variant="soft">{tipoLabel(c)}</Pill>
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink">
                    {c.rfv_score != null ? c.rfv_score : <span className="text-gray-faint">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular">
                    {yoy ? (
                      <span className={cn("font-medium", yoyColor(yoy.sign))}>
                        {yoy.sign === 1 ? "+" : ""}
                        {yoy.pct}%
                      </span>
                    ) : (
                      <span className="text-gray-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink">
                    {c.qtd_pedidos_12m.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink font-medium whitespace-nowrap">
                    {formatMoney(c.faturamento_12m)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-gray-text whitespace-nowrap">
                    {c.ticket_medio_12m > 0 ? formatMoney(c.ticket_medio_12m) : <span className="text-gray-faint">—</span>}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right text-[12.5px] tabular whitespace-nowrap",
                      ageColor(dias),
                    )}
                  >
                    {dias == null ? "—" : `${dias}d`}
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] text-ink whitespace-nowrap">
                    {c.vendedor_nome ?? <span className="text-gray-faint">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {hasCampaign && (
                      <Megaphone className="w-3.5 h-3.5 text-brand inline-block" strokeWidth={2} />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular whitespace-nowrap">
                    {venc > 0 ? (
                      <span className="inline-flex items-center gap-1 text-bad font-medium">
                        <AlertTriangle className="w-3 h-3" strokeWidth={2.2} />
                        {formatMoney(venc)}
                      </span>
                    ) : (
                      <span className="text-gray-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {limPct == null ? (
                      <span className="text-gray-faint text-[12.5px]">—</span>
                    ) : (
                      <div className="w-[60px] ml-auto">
                        <ProgressBar
                          value={Math.min(Math.max(limPct, 0), 100)}
                          variant={limPct >= 90 ? "bad" : limPct >= 70 ? "brand" : "neutral"}
                          height={4}
                        />
                        <span className="text-[10px] tabular text-gray-text mt-0.5 block text-right">
                          {Math.round(limPct)}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {score ? (
                      <span
                        className={cn(
                          "text-[12.5px] tabular font-semibold",
                          SCORE_TEXT[score] ?? "text-gray-text",
                        )}
                      >
                        {score}
                      </span>
                    ) : (
                      <span className="text-gray-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {acordo ? (
                      <span className="flex items-center gap-1.5 text-good text-[12px]">
                        <Handshake className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                        Acordo ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-faint text-[12.5px]">
                        <Sparkles className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
                        —
                      </span>
                    )}
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
