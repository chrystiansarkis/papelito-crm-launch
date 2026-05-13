// Funções puras para os KPIs da Carteira. Sem React, sem Supabase.
// Mitigates: A05 (predicados client-side, dados já vieram do banco com RLS).
import type {
  CarteiraFilter,
  ClienteKpi,
  FaixaRecencia,
  GrupoPai,
  PeriodoGrupo,
} from "../types";
import { EMPTY_CARTEIRA_FILTER } from "../types";

export const GRUPOS_PAI: GrupoPai[] = ["papeis", "filtros", "piteiras", "outros"];
export const GRUPO_LABEL: Record<GrupoPai, string> = {
  papeis: "Papéis",
  filtros: "Filtros",
  piteiras: "Piteiras",
  outros: "Outros",
};

function fatGrupo(c: ClienteKpi, periodo: PeriodoGrupo, grupo: GrupoPai): number {
  switch (periodo) {
    case "12m":
      return grupo === "papeis"
        ? c.fat_12m_papeis
        : grupo === "filtros"
          ? c.fat_12m_filtros
          : grupo === "piteiras"
            ? c.fat_12m_piteiras
            : c.fat_12m_outros;
    case "2025":
      return grupo === "papeis"
        ? c.fat_2025_papeis
        : grupo === "filtros"
          ? c.fat_2025_filtros
          : grupo === "piteiras"
            ? c.fat_2025_piteiras
            : c.fat_2025_outros;
    case "ytd":
      return grupo === "papeis"
        ? c.fat_ytd_papeis
        : grupo === "filtros"
          ? c.fat_ytd_filtros
          : grupo === "piteiras"
            ? c.fat_ytd_piteiras
            : c.fat_ytd_outros;
  }
}

export function matchesFilter(c: ClienteKpi, f: CarteiraFilter): boolean {
  if (f.ano_compra === "comprou_2025" && !c.comprou_2025) return false;
  if (f.ano_compra === "comprou_2026" && !c.comprou_2026) return false;
  if (f.grupo_pai && f.periodo_grupo) {
    if (fatGrupo(c, f.periodo_grupo, f.grupo_pai) <= 0) return false;
  }
  const d = c.dias_sem_compra;
  if (f.recencia === "0-30" && !(d != null && d <= 30)) return false;
  if (f.recencia === "31-60" && !(d != null && d >= 31 && d <= 60)) return false;
  if (f.recencia === "61-90" && !(d != null && d >= 61 && d <= 90)) return false;
  if (f.recencia === "91-180" && !(d != null && d >= 91 && d <= 180)) return false;
  if (f.recencia === "180+" && !(d != null && d > 180)) return false;
  if (f.recencia === "nunca" && c.data_ultima_compra !== null) return false;
  if (f.tendencia === "crescendo" && !(c.pct_crescimento != null && c.pct_crescimento > 0)) return false;
  if (f.tendencia === "caindo" && !(c.pct_crescimento != null && c.pct_crescimento < 0)) return false;
  if (f.vencido && !c.tem_vencido) return false;
  return true;
}

export function temFiltroAtivo(f: CarteiraFilter): boolean {
  return (
    f.ano_compra !== null ||
    f.grupo_pai !== null ||
    f.recencia !== null ||
    f.tendencia !== null ||
    f.vencido === true
  );
}

// ---------- toggles ----------
export function toggleAnoCompra(
  f: CarteiraFilter,
  v: "comprou_2025" | "comprou_2026",
): CarteiraFilter {
  return { ...f, ano_compra: f.ano_compra === v ? null : v };
}
export function toggleGrupoPeriodo(
  f: CarteiraFilter,
  grupo: GrupoPai,
  periodo: PeriodoGrupo,
): CarteiraFilter {
  const same = f.grupo_pai === grupo && f.periodo_grupo === periodo;
  return same
    ? { ...f, grupo_pai: null, periodo_grupo: null }
    : { ...f, grupo_pai: grupo, periodo_grupo: periodo };
}
export function toggleRecencia(f: CarteiraFilter, r: FaixaRecencia): CarteiraFilter {
  return { ...f, recencia: f.recencia === r ? null : r };
}
export function toggleRecenciaGrupo(
  f: CarteiraFilter,
  r: FaixaRecencia,
  grupo: GrupoPai,
): CarteiraFilter {
  const same = f.recencia === r && f.grupo_pai === grupo && f.periodo_grupo === "12m";
  return same
    ? { ...f, recencia: null, grupo_pai: null, periodo_grupo: null }
    : { ...f, recencia: r, grupo_pai: grupo, periodo_grupo: "12m" };
}
export function toggleTendencia(f: CarteiraFilter, t: "crescendo" | "caindo"): CarteiraFilter {
  return { ...f, tendencia: f.tendencia === t ? null : t };
}
export function toggleVencido(f: CarteiraFilter): CarteiraFilter {
  return { ...f, vencido: !f.vencido };
}
export const RESET_FILTER: CarteiraFilter = EMPTY_CARTEIRA_FILTER;

// ---------- agregadores ----------
export function diasDecorridosNoAno(now: Date = new Date()): number {
  const inicio = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - inicio.getTime()) / 86400000) + 1;
}

export type MacroAgg = {
  total: number;
  em_2025: number;
  em_2026: number;
  fat_2025_total: number;
  fat_ytd_total: number;
  tendencia_total: number;
  desvio_pct: number | null;
  por_grupo_2025: Record<GrupoPai, number>;
  por_grupo_ytd: Record<GrupoPai, number>;
  tendencia_por_grupo: Record<GrupoPai, number>;
  desvio_por_grupo: Record<GrupoPai, number | null>;
};

function emptyByGrupo<T>(v: T): Record<GrupoPai, T> {
  return { papeis: v, filtros: v, piteiras: v, outros: v };
}

export function agregarMacro(rows: ClienteKpi[], now: Date = new Date()): MacroAgg {
  const dias = diasDecorridosNoAno(now);
  const por_grupo_2025 = emptyByGrupo(0);
  const por_grupo_ytd = emptyByGrupo(0);
  let fat_2025_total = 0;
  let fat_ytd_total = 0;
  let tendencia_total = 0;
  let em_2025 = 0;
  let em_2026 = 0;
  for (const c of rows) {
    if (c.comprou_2025) em_2025++;
    if (c.comprou_2026) em_2026++;
    fat_2025_total += c.faturamento_ano_anterior;
    fat_ytd_total += c.faturamento_ytd;
    tendencia_total += c.tendencia_ano;
    for (const g of GRUPOS_PAI) {
      por_grupo_2025[g] += fatGrupo(c, "2025", g);
      por_grupo_ytd[g] += fatGrupo(c, "ytd", g);
    }
  }
  const tendencia_por_grupo = emptyByGrupo(0);
  const desvio_por_grupo: Record<GrupoPai, number | null> = emptyByGrupo<number | null>(null);
  for (const g of GRUPOS_PAI) {
    const tend = (por_grupo_ytd[g] / dias) * 365;
    tendencia_por_grupo[g] = tend;
    desvio_por_grupo[g] = por_grupo_2025[g] > 0 ? (tend / por_grupo_2025[g] - 1) * 100 : null;
  }
  const desvio_pct =
    fat_2025_total > 0 ? (tendencia_total / fat_2025_total - 1) * 100 : null;
  return {
    total: rows.length,
    em_2025,
    em_2026,
    fat_2025_total,
    fat_ytd_total,
    tendencia_total,
    desvio_pct,
    por_grupo_2025,
    por_grupo_ytd,
    tendencia_por_grupo,
    desvio_por_grupo,
  };
}

export type LinhaRecencia = {
  faixa: FaixaRecencia;
  count: number;
  pct: number;
  total12m: number;
  por_grupo: Record<GrupoPai, { valor: number; qtd: number }>;
};

function bucketRecencia(c: ClienteKpi): FaixaRecencia {
  if (c.data_ultima_compra === null) return "nunca";
  const d = c.dias_sem_compra ?? 0;
  if (d <= 30) return "0-30";
  if (d <= 60) return "31-60";
  if (d <= 90) return "61-90";
  if (d <= 180) return "91-180";
  return "180+";
}

export const FAIXAS_RECENCIA: FaixaRecencia[] = [
  "0-30",
  "31-60",
  "61-90",
  "91-180",
  "180+",
  "nunca",
];

export function agregarMatrizRecencia(rows: ClienteKpi[]): LinhaRecencia[] {
  const init = (): LinhaRecencia => ({
    faixa: "0-30",
    count: 0,
    pct: 0,
    total12m: 0,
    por_grupo: {
      papeis: { valor: 0, qtd: 0 },
      filtros: { valor: 0, qtd: 0 },
      piteiras: { valor: 0, qtd: 0 },
      outros: { valor: 0, qtd: 0 },
    },
  });
  const map: Record<FaixaRecencia, LinhaRecencia> = {
    "0-30": init(),
    "31-60": init(),
    "61-90": init(),
    "91-180": init(),
    "180+": init(),
    nunca: init(),
  };
  for (const f of FAIXAS_RECENCIA) map[f].faixa = f;

  for (const c of rows) {
    const b = bucketRecencia(c);
    const linha = map[b];
    linha.count++;
    if (b !== "nunca") {
      linha.total12m += c.faturamento_12m;
      for (const g of GRUPOS_PAI) {
        const v = fatGrupo(c, "12m", g);
        linha.por_grupo[g].valor += v;
        if (v > 0) linha.por_grupo[g].qtd++;
      }
    }
  }
  const tot = rows.length || 1;
  for (const f of FAIXAS_RECENCIA) map[f].pct = (map[f].count / tot) * 100;
  return FAIXAS_RECENCIA.map((f) => map[f]);
}

export type TendenciaAgg = {
  crescendo: { count: number; pct: number; tendencia_total: number };
  caindo: { count: number; pct: number; tendencia_total: number };
  vencido: { count: number; pct: number; valor_total: number };
};

export function agregarTendencia(rows: ClienteKpi[]): TendenciaAgg {
  const tot = rows.length || 1;
  let cCresc = 0,
    cCai = 0,
    cVenc = 0;
  let tCresc = 0,
    tCai = 0,
    vVenc = 0;
  for (const c of rows) {
    if (c.pct_crescimento != null && c.pct_crescimento > 0) {
      cCresc++;
      tCresc += c.tendencia_ano;
    }
    if (c.pct_crescimento != null && c.pct_crescimento < 0) {
      cCai++;
      tCai += c.tendencia_ano;
    }
    if (c.tem_vencido) {
      cVenc++;
      vVenc += c.valor_vencido;
    }
  }
  return {
    crescendo: { count: cCresc, pct: (cCresc / tot) * 100, tendencia_total: tCresc },
    caindo: { count: cCai, pct: (cCai / tot) * 100, tendencia_total: tCai },
    vencido: { count: cVenc, pct: (cVenc / tot) * 100, valor_total: vVenc },
  };
}

// ---------- formatação ----------
export function formatMilhar(n: number): string {
  return n.toLocaleString("pt-BR");
}

export function formatMoneyM(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v === 0) return "R$ 0";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  return `R$ ${(v / 1_000_000).toFixed(1)}M`;
}

export function formatPctSigned(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1).replace(".", ",")}%`;
}