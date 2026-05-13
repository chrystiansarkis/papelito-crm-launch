import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatMoneyShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  GRUPOS_PAI,
  GRUPO_LABEL,
  agregarMacro,
  agregarMatrizRecencia,
  agregarTendencia,
  formatMilhar,
  formatMoneyM,
  formatPctSigned,
  matchesFilter,
  temFiltroAtivo,
  toggleAnoCompra,
  toggleGrupoPeriodo,
  toggleRecencia,
  toggleRecenciaGrupo,
  toggleTendencia,
  toggleVencido,
} from "../../lib/carteiraKpis";
import {
  EMPTY_CARTEIRA_FILTER,
  type CarteiraFilter,
  type ClienteKpi,
  type GrupoPai,
  type PeriodoGrupo,
} from "../../types";
import { MacroKpiCard, type SubItem } from "./MacroKpiCard";
import { MatrizRecencia } from "./MatrizRecencia";
import { CardsTendencia } from "./CardsTendencia";

export type CarteiraKpisHeaderProps = {
  rows: ClienteKpi[];
  loading?: boolean;
  onIdsFiltradosChange: (ids: Set<string> | null) => void;
};

export function CarteiraKpisHeader({
  rows,
  loading,
  onIdsFiltradosChange,
}: CarteiraKpisHeaderProps) {
  const [filter, setFilter] = useState<CarteiraFilter>(EMPTY_CARTEIRA_FILTER);

  const filtrados = useMemo(() => rows.filter((c) => matchesFilter(c, filter)), [rows, filter]);
  const ativo = temFiltroAtivo(filter);

  useEffect(() => {
    onIdsFiltradosChange(ativo ? new Set(filtrados.map((c) => c.cliente_id)) : null);
  }, [filtrados, ativo, onIdsFiltradosChange]);

  const macro = useMemo(() => agregarMacro(filtrados), [filtrados]);
  const matriz = useMemo(() => agregarMatrizRecencia(filtrados), [filtrados]);
  const tend = useMemo(() => agregarTendencia(filtrados), [filtrados]);

  function reset() {
    setFilter(EMPTY_CARTEIRA_FILTER);
  }

  function makeGrupoSubItems(periodo: PeriodoGrupo, getValor: (g: GrupoPai) => string, getValorClass?: (g: GrupoPai) => string | undefined): SubItem[] {
    return GRUPOS_PAI.map((g) => ({
      key: g,
      label: GRUPO_LABEL[g],
      value: getValor(g),
      valueClass: getValorClass?.(g),
      active: filter.grupo_pai === g && filter.periodo_grupo === periodo,
      onClick: () => setFilter((f) => toggleGrupoPeriodo(f, g, periodo)),
    }));
  }

  const desvioColor = (p: number | null) =>
    p == null ? "text-gray-text" : p > 0 ? "text-good" : p < 0 ? "text-bad" : "text-gray-text";

  return (
    <section className="space-y-3">
      {ativo && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-[11px] text-gray-text hover:text-ink transition"
          >
            <X className="w-3 h-3" />
            Limpar filtros
          </button>
        </div>
      )}

      {/* Linha 1 — 5 KPIs macro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <MacroKpiCard
          label="Total clientes"
          value={loading ? "—" : formatMilhar(macro.total)}
          onClickValue={reset}
          subItems={[
            {
              key: "2025",
              label: "em 2025",
              value: formatMilhar(macro.em_2025),
              active: filter.ano_compra === "comprou_2025",
              onClick: () => setFilter((f) => toggleAnoCompra(f, "comprou_2025")),
            },
            {
              key: "2026",
              label: "em 2026",
              value: formatMilhar(macro.em_2026),
              active: filter.ano_compra === "comprou_2026",
              onClick: () => setFilter((f) => toggleAnoCompra(f, "comprou_2026")),
            },
          ]}
        />
        <MacroKpiCard
          label="Faturamento 2025"
          value={formatMoneyM(macro.fat_2025_total)}
          subItems={makeGrupoSubItems("2025", (g) => formatMoneyShort(macro.por_grupo_2025[g]))}
        />
        <MacroKpiCard
          label="Faturamento 2026 YTD"
          value={formatMoneyM(macro.fat_ytd_total)}
          subItems={makeGrupoSubItems("ytd", (g) => formatMoneyShort(macro.por_grupo_ytd[g]))}
        />
        <MacroKpiCard
          label="Tendência 2026"
          value={formatMoneyM(macro.tendencia_total)}
          subItems={makeGrupoSubItems("ytd", (g) => formatMoneyShort(macro.tendencia_por_grupo[g]))}
        />
        <MacroKpiCard
          label="Desvio vs 2025"
          value={formatPctSigned(macro.desvio_pct)}
          valueClass={desvioColor(macro.desvio_pct)}
          subItems={makeGrupoSubItems(
            "ytd",
            (g) => formatPctSigned(macro.desvio_por_grupo[g]),
            (g) => desvioColor(macro.desvio_por_grupo[g]),
          )}
        />
      </div>

      {/* Linha 2 — Matriz recência × grupo pai */}
      <MatrizRecencia
        linhas={matriz}
        filter={filter}
        onToggleFaixa={(faixa) => setFilter((f) => toggleRecencia(f, faixa))}
        onToggleCelula={(faixa, grupo) => setFilter((f) => toggleRecenciaGrupo(f, faixa, grupo))}
      />

      {/* Linha 3 — Cards de tendência */}
      <CardsTendencia
        agg={tend}
        filter={filter}
        onToggleCrescendo={() => setFilter((f) => toggleTendencia(f, "crescendo"))}
        onToggleCaindo={() => setFilter((f) => toggleTendencia(f, "caindo"))}
        onToggleVencido={() => setFilter((f) => toggleVencido(f))}
      />
    </section>
  );
}

// silence unused var warning when desvioColor unused
export const _unused = cn;