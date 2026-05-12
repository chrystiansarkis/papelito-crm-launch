// Mitigates: A05 (texto exibido como text node React, sem dangerouslySetInnerHTML)
import { useNavigate } from "react-router-dom";
import { Megaphone, Sparkles } from "lucide-react";
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

function diasDesde(d: string | null): number | null {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86400000);
}

function tipoLabel(c: CarteiraCliente): string {
  if (c.em_familia_papelito) return "Família";
  if (c.em_pdv_perfeito) return "PDV Perfeito";
  if ((c.tier ?? "").toLowerCase() === "a") return "Distribuidor";
  return "Lojista";
}

function ageColor(d: number | null): string {
  if (d == null) return "text-gray-faint";
  if (d <= 7) return "text-gray-text";
  if (d <= 14) return "text-warn";
  return "text-bad";
}

const SCORE_TEXT: Record<string, string> = {
  A: "text-good",
  B: "text-good",
  C: "text-warn",
  D: "text-bad",
  E: "text-bad",
};

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
    // Não navega se o clique veio do checkbox
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
            <Th>RFV</Th>
            <Th>ATM% ano</Th>
            <Th>Histórico</Th>
            <Th className="text-right">Fat. 12m</Th>
            <Th>Meta Q</Th>
            <Th className="text-right">Últ. compra</Th>
            <Th className="text-right">Vendedores</Th>
            <Th className="text-center">Camp.</Th>
            <Th className="text-right">Fin.</Th>
            <Th className="min-w-[160px]">Próxima ação IA</Th>
          </tr>
        </thead>

        <tbody>
          {loading && <LoadingRow colSpan={14} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={14} message="Nenhum cliente encontrado" />
          )}
          {!loading &&
            rows.map((c) => {
              const status = saudeToStatus(c.saude);
              const dias = diasDesde(c.ultima_compra);
              const isSel = selected.has(c.id);
              const score = (c.score_pagamento ?? "").toUpperCase();
              const hasCampaign = c.em_familia_papelito || c.em_pdv_perfeito;
              return (
                <tr
                  key={c.id}
                  onClick={(e) => onRowClick(e, c.id)}
                  className={cn(
                    "border-b border-gray-line transition-colors cursor-pointer",
                    isSel ? "bg-brand-soft/40" : "hover:bg-gray-soft"
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
                      <span className="text-[12.5px] font-medium text-ink">
                        {c.nome}
                      </span>
                      <span className="text-[11px] text-gray-text">
                        {c.cidade ?? "—"}
                        {c.uf ? `, ${c.uf}` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill variant="soft">{tipoLabel(c)}</Pill>
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] tabular text-gray-faint">
                    —
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] tabular text-gray-faint">
                    —
                  </td>
                  <td className="px-3 py-2.5 text-[12.5px] tabular text-gray-faint">
                    —
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink font-medium whitespace-nowrap">
                    {formatMoney(c.faturamento_12m)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="w-[60px]">
                      <ProgressBar value={0} variant="neutral" height={4} />
                      <span className="text-[10px] tabular text-gray-faint mt-0.5 block">
                        —
                      </span>
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right text-[12.5px] tabular whitespace-nowrap",
                      ageColor(dias)
                    )}
                  >
                    {dias == null ? "—" : `${dias}d`}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink">
                    {c.vendedor_nome ? 1 : 0}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {hasCampaign && (
                      <Megaphone
                        className="w-3.5 h-3.5 text-brand inline-block"
                        strokeWidth={2}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {score ? (
                      <span
                        className={cn(
                          "text-[12.5px] tabular font-medium",
                          SCORE_TEXT[score] ?? "text-gray-text"
                        )}
                      >
                        {score}
                      </span>
                    ) : (
                      <span className="text-gray-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-gray-faint text-[12.5px]">
                      <Sparkles
                        className="w-3 h-3 text-gray-faint flex-shrink-0"
                        strokeWidth={2}
                      />
                      —
                    </span>
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
    <th
      className={cn("px-3 py-2.5 text-left label-caps text-gray-text", className)}
    >
      {children}
    </th>
  );
}
