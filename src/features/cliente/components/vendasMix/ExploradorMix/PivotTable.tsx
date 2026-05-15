import { useMemo, useRef, useState } from "react";
import { ChevronsUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { PivotRow } from "./PivotRow";
import { buildRows, type MixSort, type LinhaPivot, type MetricaValores } from "../../../lib/vendasMixPivot";
import type {
  GrupoPaiKey,
  MediaTierGrupoPai,
  MixFiltros,
  MixMetrica,
} from "../../../types";
import {
  MIX_COLUMN_LABEL,
  type MixColumnId,
} from "./columns";

const METRICA_SUFFIX_LABEL: Record<MixMetrica, string> = {
  rs: "R$",
  qtd: "Un",
  pct: "%",
};

function SortableHeader({
  by, sort, onSort, children, align = "right",
}: {
  by: string;
  sort: MixSort | null;
  onSort: (by: string) => void;
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  const active = sort?.by === by;
  const dir = active ? sort?.dir : null;
  return (
    <th className={`px-2 py-2 select-none ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(by)}
        className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
      >
        <span>{children}</span>
        {dir === "asc" ? <ArrowUp size={10} /> : dir === "desc" ? <ArrowDown size={10} /> : <ChevronsUpDown size={10} className="opacity-40" />}
      </button>
    </th>
  );
}

// Constrói uma "linha" sintética da média do tier somando médias dos meses
// dentro de cada coluna do pivot, pra que a renderização use o mesmo CelulaStacked.
function buildMediaTierLinha(
  paiKey: GrupoPaiKey,
  paiLabel: string,
  tier: string,
  medias: MediaTierGrupoPai[],
  filtros: MixFiltros,
): LinhaPivot {
  const cellsByMetric: Record<string, MetricaValores> = {};
  let totalRs = 0;
  let totalQtd = 0;
  function colKey(ano: number, mes: number): string {
    if (filtros.granularidade === "ano") return String(ano);
    if (filtros.granularidade === "tri") return `${ano}-T${Math.ceil(mes / 3)}`;
    return `${ano}-${String(mes).padStart(2, "0")}`;
  }
  const periodosSet = new Set<string>();
  for (const k of filtros.periodos) {
    const parts = k.split("-");
    if (parts.length === 1) {
      for (let m = 1; m <= 12; m++) periodosSet.add(`${parts[0]}-${m}`);
    } else if (parts[1].startsWith("T")) {
      const tri = Number(parts[1].slice(1));
      for (let m = (tri - 1) * 3 + 1; m <= tri * 3; m++) periodosSet.add(`${parts[0]}-${m}`);
    } else {
      periodosSet.add(`${parts[0]}-${Number(parts[1])}`);
    }
  }
  for (const r of medias) {
    if (r.grupo_pai !== paiKey) continue;
    if (!periodosSet.has(`${r.ano}-${r.mes}`)) continue;
    const k = colKey(r.ano, r.mes);
    const cur = cellsByMetric[k] ?? { rs: 0, qtd: 0, pct: 0 };
    cur.rs += r.valor_medio;
    cur.qtd += r.qtd_media;
    cellsByMetric[k] = cur;
    totalRs += r.valor_medio;
    totalQtd += r.qtd_media;
  }
  return {
    key: `__media_tier__${paiKey}`,
    nivel: 1,
    parentKey: null,
    scope: "media_tier",
    scopeValue: tier,
    label: `↳ Média da carteira (Tier ${tier === "__geral__" ? "geral" : tier}) — ${paiLabel}`,
    cellsByMetric,
    total: { rs: totalRs, qtd: totalQtd, pct: 0 },
    ultimaCompra: null,
    diasSemCompra: null,
    tend2026: null,
    vs2025: null,
    fat2025Bruto: { rs: 0, qtd: 0 },
    fat2026Bruto: { rs: 0, qtd: 0 },
    ticketMedio12m: null,
    venda12m:         { rs: 0, qtd: 0, pct: 0 },
    venda12mAnterior: { rs: 0, qtd: 0, pct: 0 },
    cresc12m: { rs: null, qtd: null },
  };
}

export function PivotTable({
  vendas,
  filtros,
  expandidos,
  onToggleExpand,
  selecionado,
  onSelect,
  clienteId,
  sort,
  onSort,
  visibleMeta,
  mediasTier,
  tier,
  displayMap,
}: {
  vendas: import("../../../types").VendaLong[];
  filtros: MixFiltros;
  expandidos: Set<string>;
  onToggleExpand: (k: string) => void;
  selecionado: string | null;
  onSelect: (k: string | null) => void;
  clienteId: string;
  sort: MixSort | null;
  onSort: (by: string) => void;
  visibleMeta: MixColumnId[];
  mediasTier: MediaTierGrupoPai[];
  tier: string | null;
  displayMap?: Map<string, string>;
}) {
  const { rows, colunas, total } = useMemo(
    () => buildRows(vendas, filtros, expandidos, sort, displayMap),
    [vendas, filtros, expandidos, sort, displayMap],
  );
  const metricas = filtros.metricas.length > 0 ? filtros.metricas : (["rs"] as MixMetrica[]);

  // Cada coluna lógica de período (ex.: "Mai/26") vira N sub-colunas, uma
  // por métrica ativa. Mantém a leitura limpa e o export sem mistura.
  const colunasFisicas = useMemo(
    () =>
      colunas.flatMap((c) =>
        metricas.map((m) => ({
          baseKey: c.key,
          metrica: m,
          sortKey: `${c.key}__${m}`,
          label: metricas.length > 1 ? `${c.label} ${METRICA_SUFFIX_LABEL[m]}` : c.label,
          isAtual: c.isAtual,
        })),
      ),
    [colunas, metricas],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  if (rows.length === 0) {
    return <div className="text-sm text-gray-faint p-6 text-center">Sem dados no período selecionado.</div>;
  }

  // Injetar linhas "Média Tier" no fim de cada bloco de pai expandido.
  const labelPai: Record<string, string> = {
    papeis: "Papéis", filtros: "Filtros", piteiras: "Piteiras", outros: "Outros",
  };
  const tierKey = tier ?? "__geral__";

  const rowsAumentadas: Array<LinhaPivot & { _variant?: "media_tier" }> = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    rowsAumentadas.push(r);
    if (r.nivel === 1 && r.scope === "grupo_pai" && expandidos.has(r.key)) {
      // próximo nivel-1 ou fim
      const proxIdx = rows.findIndex((x, idx) => idx > i && x.nivel === 1);
      const ehUltimoBloco = proxIdx === -1 || proxIdx === i + 1;
      if (!ehUltimoBloco || rows.slice(i + 1, proxIdx === -1 ? undefined : proxIdx).length > 0) {
        // só injeta uma vez, depois do último filho do bloco
        const fim = proxIdx === -1 ? rows.length : proxIdx;
        // o append precisa acontecer DEPOIS dos filhos — então marco pra inserir
        // após copiar todos os filhos no for. Pra simplificar, faço uma passada
        // de pós-processamento abaixo.
      }
    }
  }
  // Pós-processamento: insere média tier antes de cada novo nivel-1 quando o pai anterior estava expandido.
  const final: Array<LinhaPivot & { _variant?: "media_tier" }> = [];
  for (let i = 0; i < rowsAumentadas.length; i++) {
    const r = rowsAumentadas[i];
    final.push(r);
    const next = rowsAumentadas[i + 1];
    const isLastOfBlock =
      r.parentKey != null || (r.nivel === 1 && r.scope === "grupo_pai" && !expandidos.has(r.key));
    const blockClosing =
      // troca de bloco de grupo_pai
      (next && next.nivel === 1 && next.scope === "grupo_pai") ||
      // fim total
      (!next && r.nivel > 1);
    if (blockClosing && r.nivel > 1) {
      const paiKey = (r.parentKey ?? "").split(">")[0];
      if (paiKey) {
        const linhaMedia = buildMediaTierLinha(
          paiKey as GrupoPaiKey,
          labelPai[paiKey] ?? paiKey,
          tierKey,
          mediasTier,
          filtros,
        );
        if (Object.keys(linhaMedia.cellsByMetric).length > 0) {
          (linhaMedia as LinhaPivot & { _variant?: "media_tier" })._variant = "media_tier";
          final.push(linhaMedia as LinhaPivot & { _variant?: "media_tier" });
        }
      }
    }
    void isLastOfBlock;
  }

  return (
    <div
      className="overflow-x-auto"
      ref={scrollRef}
      onScroll={(e) => {
        const x = (e.target as HTMLDivElement).scrollLeft;
        if (x > 0 !== scrolled) setScrolled(x > 0);
      }}
    >
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-faint border-b border-gray-line">
            <th
              className={`px-2 py-2 text-left sticky left-0 top-0 z-20 bg-paper ${
                scrolled ? "shadow-[2px_0_4px_rgba(0,0,0,0.06)]" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onSort("__produto__")}
                className={`inline-flex items-center gap-1 hover:text-ink ${sort?.by === "__produto__" ? "text-ink" : ""}`}
              >
                Produto
                {sort?.by === "__produto__"
                  ? sort.dir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                  : <ChevronsUpDown size={10} className="opacity-40" />}
              </button>
            </th>
            {colunasFisicas.map((c) => (
              <SortableHeader key={c.sortKey} by={c.sortKey} sort={sort} onSort={onSort}>
                <span className={c.isAtual ? "text-ink" : ""}>{c.label}</span>
              </SortableHeader>
            ))}
            {visibleMeta.map((id) => {
              const align =
                id === "obs" || id === "vs" || id === "sem_compra" ||
                id === "cresc12m_rs" || id === "cresc12m_qtd"
                  ? "center" : "right";
              const sortBy =
                id === "total_rs" ? "__total__rs"
                : id === "total_qtd" ? "__total__qtd"
                : id === "tend_rs" ? "__tend__rs"
                : id === "tend_qtd" ? "__tend__qtd"
                : id === "vs" ? "__vs__"
                : id === "ticket" ? "__ticket__"
                : id === "sem_compra" ? "__sem_compra__"
                : id === "venda12m_rs" ? "__venda12m__rs"
                : id === "venda12m_qtd" ? "__venda12m__qtd"
                : id === "cresc12m_rs" ? "__cresc12m__rs"
                : id === "cresc12m_qtd" ? "__cresc12m__qtd"
                : null;
              if (sortBy) {
                return (
                  <SortableHeader key={id} by={sortBy} sort={sort} onSort={onSort} align={align}>
                    {MIX_COLUMN_LABEL[id]}
                  </SortableHeader>
                );
              }
              return (
                <th key={id} className={`px-2 py-2 text-${align}`}>
                  {MIX_COLUMN_LABEL[id]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {final.map((linha) => {
            const variant = linha._variant ?? "normal";
            return (
              <PivotRow
                key={linha.key}
                linha={linha}
                colunasFisicas={colunasFisicas}
                metricaPrim={metricas[0] ?? "rs"}
                visibleMeta={visibleMeta}
                expandivel={variant === "normal" && linha.nivel < 3}
                expandido={expandidos.has(linha.key)}
                onToggleExpand={() => onToggleExpand(linha.key)}
                selecionado={selecionado === linha.key}
                onSelect={() => variant === "normal" && onSelect(selecionado === linha.key ? null : linha.key)}
                clienteId={clienteId}
                variant={variant}
                showStickyShadow={scrolled}
              />
            );
          })}
          <PivotRow
            linha={total}
            colunasFisicas={colunasFisicas}
            metricaPrim={metricas[0] ?? "rs"}
            visibleMeta={visibleMeta}
            expandivel={false}
            expandido={false}
            selecionado={false}
            clienteId={clienteId}
            variant="total"
            showStickyShadow={scrolled}
          />
        </tbody>
      </table>
    </div>
  );
}
