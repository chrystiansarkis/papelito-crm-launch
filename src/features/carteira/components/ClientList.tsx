// Mitigates: A05 (texto exibido como text node React, sem dangerouslySetInnerHTML)
//
// ClientList: agora consome public.vw_cliente_ficha (via listCarteiraClientes),
// que traz KPIs financeiros, score de pagamento, cobrança e variação YoY já
// calculados — não precisamos mais de placeholders "—" nas colunas centrais.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Handshake,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/common/Pill";
import { StatusDot } from "@/components/common/StatusDot";
import { ProgressBar } from "@/components/common/ProgressBar";
import { LoadingRow, EmptyRow } from "@/components/common/LoadingRow";
import { formatMoney, formatMoneyShort, formatDateLong } from "@/lib/format";
import { saudeToStatus } from "../lib/mapSaude";
import type { CarteiraCliente, ClienteKpi } from "../types";
import {
  CARTEIRA_COLUMNS,
  COLUMN_BY_ID,
  type CarteiraColumnId,
} from "../lib/columns";
import type { SortState } from "../hooks/useTableSort";

export type ClientListProps = {
  rows: CarteiraCliente[];
  loading: boolean;
  selected: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  kpiByClienteId?: Map<string, ClienteKpi>;
  visibleColumns?: CarteiraColumnId[];
  sort?: SortState;
  onSortToggle?: (id: CarteiraColumnId) => void;
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

type CellCtx = {
  kpiByClienteId?: Map<string, ClienteKpi>;
  isSelected?: boolean;
  scrolled?: boolean;
};

type ColumnRenderer = {
  align?: "left" | "right" | "center";
  headerClass?: string;
  cell: (c: CarteiraCliente, ctx: CellCtx) => JSX.Element;
};

function moneyCompactCell(value: number | null | undefined, extraClass = "") {
  return (
    <td
      className={cn(
        "px-3 py-2.5 text-right text-[12.5px] tabular whitespace-nowrap",
        extraClass || "text-ink",
      )}
    >
      {value == null ? (
        <span className="text-gray-faint">—</span>
      ) : (
        formatMoneyShort(value)
      )}
    </td>
  );
}

function makeYearRenderer(
  field: "fat_2020" | "fat_2021" | "fat_2022" | "fat_2023" | "fat_2024" | "fat_2025" | "fat_2026",
): ColumnRenderer {
  return {
    align: "right",
    cell: (c, ctx) => {
      const kpi = ctx.kpiByClienteId?.get(c.id);
      return moneyCompactCell(kpi ? kpi[field] : null);
    },
  };
}

const COLUMN_RENDERERS: Record<CarteiraColumnId, ColumnRenderer> = {
  cliente: {
    align: "left",
    headerClass: "min-w-[180px]",
    cell: (c, ctx) => (
      <td
        className={cn(
          "px-3 py-2.5 sticky left-8 z-[1] border-r border-gray-line transition-shadow",
          ctx.isSelected
            ? "bg-brand-soft/95"
            : "bg-white group-hover/row:bg-gray-soft",
          ctx.scrolled && "shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]",
        )}
      >
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-ink">{c.nome}</span>
          <span className="text-[11px] text-gray-text">
            {c.cidade ?? "—"}
            {c.uf ? `, ${c.uf}` : ""}
          </span>
        </div>
      </td>
    ),
  },
  saude: {
    align: "left",
    cell: (c) => (
      <td className="px-3 py-2.5">
        <StatusDot status={saudeToStatus(c.saude)} />
      </td>
    ),
  },
  tipo: {
    align: "left",
    cell: (c) => (
      <td className="px-3 py-2.5">
        <Pill variant="soft">{tipoLabel(c)}</Pill>
      </td>
    ),
  },
  rfv: {
    align: "right",
    cell: (c) => (
      <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink">
        {c.rfv_score != null ? c.rfv_score : <span className="text-gray-faint">—</span>}
      </td>
    ),
  },
  yoy: {
    align: "right",
    cell: (c) => {
      const yoy = yoyVariation(c);
      return (
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
      );
    },
  },
  pedidos_12m: {
    align: "right",
    cell: (c) => (
      <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink">
        {c.qtd_pedidos_12m.toLocaleString("pt-BR")}
      </td>
    ),
  },
  fat_12m: {
    align: "right",
    cell: (c) => (
      <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-ink font-medium whitespace-nowrap">
        {formatMoney(c.faturamento_12m)}
      </td>
    ),
  },
  fat_2020: makeYearRenderer("fat_2020"),
  fat_2021: makeYearRenderer("fat_2021"),
  fat_2022: makeYearRenderer("fat_2022"),
  fat_2023: makeYearRenderer("fat_2023"),
  fat_2024: makeYearRenderer("fat_2024"),
  fat_2025: makeYearRenderer("fat_2025"),
  fat_2026: makeYearRenderer("fat_2026"),
  tendencia_2026: {
    align: "right",
    cell: (c, ctx) => {
      const kpi = ctx.kpiByClienteId?.get(c.id);
      return moneyCompactCell(kpi?.tendencia_2026 ?? null, "text-gray-text");
    },
  },
  desvio_2026: {
    align: "right",
    cell: (c, ctx) => {
      const kpi = ctx.kpiByClienteId?.get(c.id);
      const v = kpi?.desvio_2026 ?? null;
      return (
        <td className="px-3 py-2.5 text-right text-[12.5px] tabular whitespace-nowrap">
          {v == null ? (
            <span className="text-gray-faint">—</span>
          ) : (
            <span
              className={cn(
                "font-medium",
                v > 0.05 ? "text-good" : v < -0.05 ? "text-bad" : "text-gray-text",
              )}
            >
              {v > 0 ? "+" : ""}
              {v.toFixed(1).replace(".", ",")}%
            </span>
          )}
        </td>
      );
    },
  },
  ticket_medio: {
    align: "right",
    cell: (c) => (
      <td className="px-3 py-2.5 text-right text-[12.5px] tabular text-gray-text whitespace-nowrap">
        {c.ticket_medio_12m > 0 ? (
          formatMoney(c.ticket_medio_12m)
        ) : (
          <span className="text-gray-faint">—</span>
        )}
      </td>
    ),
  },
  sem_compra: {
    align: "right",
    cell: (c) => {
      const dias = c.dias_sem_compra;
      return (
        <td
          className={cn(
            "px-3 py-2.5 text-right text-[12.5px] tabular whitespace-nowrap",
            ageColor(dias),
          )}
        >
          {dias == null ? "—" : `${dias}d`}
        </td>
      );
    },
  },
  ultima_venda: {
    align: "right",
    cell: (c, ctx) => {
      const kpi = ctx.kpiByClienteId?.get(c.id);
      const ultimaVenda = kpi?.data_ultima_compra ?? c.data_ultima_compra;
      return (
        <td className="px-3 py-2.5 text-right text-[12.5px] tabular whitespace-nowrap">
          {ultimaVenda ? (
            <span className="text-ink">{formatDateLong(ultimaVenda)}</span>
          ) : (
            <span className="text-gray-faint">—</span>
          )}
        </td>
      );
    },
  },
  ultimo_atendimento: {
    align: "right",
    cell: (c, ctx) => {
      const kpi = ctx.kpiByClienteId?.get(c.id);
      const ultimoAtend = kpi?.data_ultimo_atendimento ?? null;
      return (
        <td className="px-3 py-2.5 text-right text-[12.5px] tabular whitespace-nowrap">
          {ultimoAtend ? (
            <span className="text-ink">{formatDateLong(ultimoAtend)}</span>
          ) : (
            <span className="text-gray-faint">—</span>
          )}
        </td>
      );
    },
  },
  vendedor: {
    align: "left",
    cell: (c) => (
      <td className="px-3 py-2.5 text-[12.5px] text-ink whitespace-nowrap">
        {c.vendedor_nome ?? <span className="text-gray-faint">—</span>}
      </td>
    ),
  },
  camp: {
    align: "center",
    cell: (c) => {
      const hasCampaign = c.em_familia_papelito || c.em_pdv_perfeito;
      return (
        <td className="px-3 py-2.5 text-center">
          {hasCampaign && (
            <Megaphone className="w-3.5 h-3.5 text-brand inline-block" strokeWidth={2} />
          )}
        </td>
      );
    },
  },
  vencido: {
    align: "right",
    cell: (c) => {
      const venc = c.total_vencido;
      return (
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
      );
    },
  },
  limite_pct: {
    align: "right",
    cell: (c) => {
      const limPct = c.limite_pct_utilizado;
      return (
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
      );
    },
  },
  fin: {
    align: "center",
    cell: (c) => {
      const score = (c.score_pagamento ?? "").toUpperCase();
      return (
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
      );
    },
  },
  proxima_acao: {
    align: "left",
    headerClass: "min-w-[140px]",
    cell: (c) => (
      <td className="px-3 py-2.5">
        {c.tem_acordo_ativo ? (
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
    ),
  },
};

const DEFAULT_VISIBLE: CarteiraColumnId[] = CARTEIRA_COLUMNS.map((c) => c.id);

export function ClientList({
  rows,
  loading,
  selected,
  onSelectAll,
  onSelectRow,
  kpiByClienteId,
  visibleColumns,
  sort,
  onSortToggle,
}: ClientListProps) {
  const navigate = useNavigate();
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const cols = visibleColumns && visibleColumns.length > 0 ? visibleColumns : DEFAULT_VISIBLE;
  const totalCols = cols.length + 1; // +1 = checkbox column

  // Sombra suave à direita das colunas sticky quando há scroll horizontal.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollLeft > 0);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function onRowClick(e: React.MouseEvent, id: string) {
    const target = e.target as HTMLElement;
    if (target.closest("input[type='checkbox']")) return;
    navigate(`/cliente/${id}`);
  }

  return (
    <div
      ref={scrollRef}
      className="bg-white border border-gray-line rounded-lg overflow-x-auto"
    >
      <table className="w-full">
        <thead className="bg-gray-soft">
          <tr>
            <th className="px-3 py-2.5 text-left w-8 sticky left-0 z-[2] bg-gray-soft">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-line cursor-pointer"
                aria-label="Selecionar todos"
              />
            </th>
            {cols.map((id) => {
              const r = COLUMN_RENDERERS[id];
              return (
                <HeaderCell
                  key={id}
                  id={id}
                  align={r.align}
                  headerClass={r.headerClass}
                  sort={sort}
                  onSortToggle={onSortToggle}
                  scrolled={scrolled}
                />
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading && <LoadingRow colSpan={totalCols} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={totalCols} message="Nenhum cliente encontrado" />
          )}
          {!loading &&
            rows.map((c) => {
              const isSel = selected.has(c.id);
              const rowCtx: CellCtx = { kpiByClienteId, isSelected: isSel, scrolled };
              return (
                <tr
                  key={c.id}
                  onClick={(e) => onRowClick(e, c.id)}
                  className={cn(
                    "group/row border-b border-gray-line transition-colors cursor-pointer",
                    isSel ? "bg-brand-soft/40" : "hover:bg-gray-soft",
                  )}
                >
                  <td
                    className={cn(
                      "px-3 py-2.5 sticky left-0 z-[1]",
                      isSel ? "bg-brand-soft/95" : "bg-white group-hover/row:bg-gray-soft",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => onSelectRow(c.id, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-line cursor-pointer"
                      aria-label={`Selecionar ${c.nome}`}
                    />
                  </td>
                  {cols.map((id) => {
                    const r = COLUMN_RENDERERS[id];
                    return <CellWrap key={id} id={id} cliente={c} ctx={rowCtx} render={r.cell} />;
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

function HeaderCell({
  id,
  align,
  headerClass,
  sort,
  onSortToggle,
  scrolled,
}: {
  id: CarteiraColumnId;
  align?: "left" | "right" | "center";
  headerClass?: string;
  sort?: SortState;
  onSortToggle?: (id: CarteiraColumnId) => void;
  scrolled?: boolean;
}) {
  const def = COLUMN_BY_ID[id];
  const sortable = def.sortable !== false && !!onSortToggle;
  const isActive = sort?.sortBy === id && sort.direction != null;
  const dir = isActive ? sort!.direction : null;
  const isSticky = id === "cliente";

  const alignCls =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const justifyCls =
    align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  const stickyCls = isSticky
    ? cn(
        "sticky left-8 z-[2] bg-gray-soft border-r border-gray-line transition-shadow",
        scrolled && "shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]",
      )
    : "";

  const inner = (
    <span className={cn("inline-flex items-center gap-1", justifyCls)}>
      <span className={cn(isActive && "font-semibold text-ink")}>{def.label}</span>
      {sortable && (
        <span className="inline-flex flex-col -space-y-1 leading-none">
          {dir === "asc" ? (
            <ChevronUp className="w-3 h-3 text-ink" strokeWidth={2.5} />
          ) : dir === "desc" ? (
            <ChevronDown className="w-3 h-3 text-ink" strokeWidth={2.5} />
          ) : (
            <ChevronUp className="w-3 h-3 text-gray-faint opacity-0 group-hover/th:opacity-60" strokeWidth={2} />
          )}
        </span>
      )}
    </span>
  );

  return (
    <th
      className={cn(
        "px-3 py-2.5 label-caps text-gray-text",
        alignCls,
        headerClass,
        stickyCls,
        sortable && "cursor-pointer select-none group/th hover:bg-gray-line/40",
      )}
      onClick={sortable ? () => onSortToggle!(id) : undefined}
      aria-sort={
        isActive ? (dir === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined
      }
    >
      {inner}
    </th>
  );
}

function CellWrap({
  id,
  cliente,
  ctx,
  render,
}: {
  id: CarteiraColumnId;
  cliente: CarteiraCliente;
  ctx: CellCtx;
  render: (c: CarteiraCliente, ctx: CellCtx) => JSX.Element;
}) {
  return render(cliente, ctx);
}

