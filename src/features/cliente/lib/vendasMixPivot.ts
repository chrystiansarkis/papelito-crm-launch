// Funções puras pra Sprint 2 / 2.5 — Tab Vendas & Mix.
// Mantemos cálculos fora dos componentes pra facilitar teste e reuso.
import type {
  GrupoPaiKey,
  MixFiltros,
  MixGranularidade,
  MixMetrica,
  VendaLong,
} from "../types";

export type Periodo = { ano: number; mes: number };

export type ColunaPivot = {
  key: string;     // "2025" | "2025-T1" | "2025-01"
  label: string;
  ano: number;
  bucket: number;  // 0=ano | 1..4=tri | 1..12=mes
  granularidade: MixGranularidade;
  isAtual: boolean;
};

// Valor numérico por métrica (rs/qtd/pct) num dado escopo.
export type MetricaValores = {
  rs: number;
  qtd: number;
  pct: number; // 0..100; sempre derivado do total geral em rs
};

export type LinhaPivot = {
  key: string;
  nivel: 1 | 2 | 3;
  parentKey: string | null;
  scope: "grupo_pai" | "grupo_filho" | "sku" | "media_tier" | "total";
  scopeValue: string;
  label: string;
  // Map colKey -> valor por métrica.
  cellsByMetric: Record<string, MetricaValores>;
  total: MetricaValores;
  ultimaCompra: string | null; // "YYYY-MM-01"
  diasSemCompra: number | null;
  tend2026: MetricaValores | null;
  vs2025: { rs: number | null; qtd: number | null } | null;
  // Brutos pra Bloco 8 alertaVs2025 — necessários pra distinguir
  // "ambos zero" de "queda 100%" e "novo cliente".
  fat2025Bruto: { rs: number; qtd: number };
  fat2026Bruto: { rs: number; qtd: number };
  ticketMedio12m: number | null; // R$/un, só nivel SKU
  // Sprint 2.6c — janelas rolling 12m (independem do filtro de período).
  venda12m: MetricaValores;
  venda12mAnterior: MetricaValores;
  cresc12m: { rs: number | null; qtd: number | null };
};

export type MixSort = {
  // colKey de período | "__total__" | "__tend__" | "__vs__" | "__ticket__" | "__sem_compra__" | "__produto__"
  by: string;
  dir: "asc" | "desc";
};

const MES_LABEL = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function triDoMes(m: number): number {
  return Math.ceil(m / 3);
}

// ============================================================
// 1) Períodos
// ============================================================
export function expandPeriodos(
  periodos: string[],
  anosDisponiveis: number[] = rangeAnos(),
): Periodo[] {
  if (periodos.length === 0) return [];
  const out = new Set<string>();
  for (const k of periodos) {
    const parts = k.split("-");
    if (parts.length === 1) {
      const ano = Number(parts[0]);
      for (let m = 1; m <= 12; m++) out.add(`${ano}-${m}`);
    } else if (parts.length === 2 && parts[1].startsWith("T")) {
      const ano = Number(parts[0]);
      const tri = Number(parts[1].slice(1));
      for (let m = (tri - 1) * 3 + 1; m <= tri * 3; m++) out.add(`${ano}-${m}`);
    } else if (parts.length === 2) {
      const ano = Number(parts[0]);
      const mes = Number(parts[1]);
      out.add(`${ano}-${mes}`);
    }
  }
  const pares: Periodo[] = [];
  out.forEach((k) => {
    const [ano, mes] = k.split("-").map(Number);
    if (anosDisponiveis.includes(ano)) pares.push({ ano, mes });
  });
  return pares.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
}

export function rangeAnos(start = 2020, end = new Date().getFullYear()): number[] {
  const out: number[] = [];
  for (let y = start; y <= end; y++) out.push(y);
  return out;
}

export function buildColunas(
  periodos: Periodo[],
  granularidade: MixGranularidade,
): ColunaPivot[] {
  if (periodos.length === 0) return [];
  const anoAtual = new Date().getFullYear();
  const seen = new Set<string>();
  const cols: ColunaPivot[] = [];
  for (const p of periodos) {
    let key: string, label: string, bucket: number;
    if (granularidade === "ano") {
      key = String(p.ano); label = String(p.ano); bucket = 0;
    } else if (granularidade === "tri") {
      const t = triDoMes(p.mes);
      key = `${p.ano}-T${t}`; label = `${p.ano} T${t}`; bucket = t;
    } else {
      key = `${p.ano}-${String(p.mes).padStart(2, "0")}`;
      label = `${MES_LABEL[p.mes - 1]}/${String(p.ano).slice(2)}`;
      bucket = p.mes;
    }
    if (!seen.has(key)) {
      seen.add(key);
      cols.push({
        key, label, ano: p.ano, bucket, granularidade,
        isAtual: p.ano === anoAtual,
      });
    }
  }
  return cols;
}

function colKeyForVenda(v: VendaLong, granularidade: MixGranularidade): string {
  if (granularidade === "ano") return String(v.ano);
  if (granularidade === "tri") return `${v.ano}-T${triDoMes(v.mes)}`;
  return `${v.ano}-${String(v.mes).padStart(2, "0")}`;
}

// ============================================================
// 2) Buckets internos
// ============================================================
type AggBucket = {
  cells: Map<string, { rs: number; qtd: number }>;
  totalRs: number;
  totalQtd: number;
  ultimaIdx: number; // ano*12+mes
  ytd2026Rs: number;
  ytd2026Qtd: number;
  fat2025Rs: number;
  fat2025Qtd: number;
  // pra ticket médio últimos 12m (= rs12mAtual / qtd12mAtual)
  rs12m: number;
  qtd12m: number;
  // Sprint 2.6c — janela 12m anterior (12-23 meses atrás), pra cresc12m.
  rs12mAnterior: number;
  qtd12mAnterior: number;
};

function emptyBucket(): AggBucket {
  return {
    cells: new Map(),
    totalRs: 0, totalQtd: 0, ultimaIdx: -1,
    ytd2026Rs: 0, ytd2026Qtd: 0,
    fat2025Rs: 0, fat2025Qtd: 0,
    rs12m: 0, qtd12m: 0,
    rs12mAnterior: 0, qtd12mAnterior: 0,
  };
}

function diasDesde(idx: number): number | null {
  if (idx < 0) return null;
  const ano = Math.floor(idx / 12);
  const mes = idx % 12;
  const ref = new Date(ano, mes - 1, 1);
  return Math.floor((Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24));
}

function ultimaCompraISO(idx: number): string | null {
  if (idx < 0) return null;
  const ano = Math.floor(idx / 12);
  const mes = idx % 12;
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

export function dayOfYear(d: Date = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============================================================
// 3) buildRows
// ============================================================
const ORDEM_GRUPO_PAI: GrupoPaiKey[] = ["papeis", "filtros", "piteiras", "outros"];
const LABEL_GRUPO_PAI: Record<GrupoPaiKey, string> = {
  papeis: "Papéis", filtros: "Filtros", piteiras: "Piteiras", outros: "Outros",
};

// Mapeia grupo_pai sintético → o(s) NIVEL_1 cru(s) que ele agrega.
// Sprint 2.6 Bloco 3: usado pra resolver nome amigável quando a UI preferir
// o display vindo do banco. Hoje pais de UI são fixos (4 buckets), então
// sem mapping caímos no LABEL_GRUPO_PAI default.
function paiDisplayLabel(
  paiKey: GrupoPaiKey,
  displayMap?: Map<string, string>,
): string {
  if (!displayMap) return LABEL_GRUPO_PAI[paiKey];
  const candidatos: string[] =
    paiKey === "papeis"   ? ["PAPÉIS PARA FUMO"] :
    paiKey === "filtros"  ? ["FILTROS"] :
    paiKey === "piteiras" ? ["PITEIRAS", "PA PITEIRAS"] :
    [];
  for (const c of candidatos) {
    const hit = displayMap.get(c.toUpperCase().trim());
    if (hit) return hit;
  }
  return LABEL_GRUPO_PAI[paiKey];
}

function metricaPrincipal(filtros: MixFiltros): MixMetrica {
  if (filtros.metricas && filtros.metricas.length > 0) return filtros.metricas[0];
  return "rs";
}

function bumpBucket(b: AggBucket, colKey: string, rs: number, qtd: number, ano: number, mes: number, today: Date) {
  if (rs !== 0 || qtd !== 0) {
    const cur = b.cells.get(colKey) ?? { rs: 0, qtd: 0 };
    cur.rs += rs; cur.qtd += qtd;
    b.cells.set(colKey, cur);
    b.totalRs += rs; b.totalQtd += qtd;
    const idx = ano * 12 + mes;
    if (idx > b.ultimaIdx) b.ultimaIdx = idx;
  }
  const yearNow = today.getFullYear();
  const monthNow = today.getMonth() + 1;
  if (ano === 2026 && (ano < yearNow || (ano === yearNow && mes <= monthNow))) {
    b.ytd2026Rs += rs; b.ytd2026Qtd += qtd;
  }
  if (ano === 2025) { b.fat2025Rs += rs; b.fat2025Qtd += qtd; }
  // Janelas rolling 12m (Sprint 2.6c).
  const idxAtual = yearNow * 12 + monthNow;
  const idx = ano * 12 + mes;
  const cutoff = idxAtual - 12;       // últimos 12m corridos
  const cutoffAnt = idxAtual - 24;    // 12-23m atrás
  if (idx > cutoff && idx <= idxAtual) {
    b.rs12m += rs; b.qtd12m += qtd;
  }
  if (idx > cutoffAnt && idx <= cutoff) {
    b.rs12mAnterior += rs; b.qtd12mAnterior += qtd;
  }
}

function pctSafe(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

function buildMetricaValores(
  rs: number,
  qtd: number,
  totalRs: number,
): MetricaValores {
  return { rs, qtd, pct: pctSafe(rs, totalRs) };
}

function calcTendVs(
  b: AggBucket,
  doy: number,
): {
  tend: MetricaValores | null;
  vs: { rs: number | null; qtd: number | null } | null;
} {
  if (doy <= 0) return { tend: null, vs: null };
  const tendRs = (b.ytd2026Rs / doy) * 365;
  const tendQtd = (b.ytd2026Qtd / doy) * 365;
  const tend: MetricaValores = { rs: tendRs, qtd: tendQtd, pct: 0 };
  const vsRs = b.fat2025Rs > 0 ? (tendRs / b.fat2025Rs - 1) * 100 : null;
  const vsQtd = b.fat2025Qtd > 0 ? (tendQtd / b.fat2025Qtd - 1) * 100 : null;
  return { tend, vs: { rs: vsRs, qtd: vsQtd } };
}

function ticketMedio(b: AggBucket): number | null {
  if (b.qtd12m <= 0) return null;
  const t = b.rs12m / b.qtd12m;
  return t > 0 ? t : null;
}

// Sprint 2.6c — Cresc. 12m (% atual vs anterior).
// Reaproveita mesma semântica de alertaVs2025 (que aceita A vs B genérico).
function calcCresc12m(b: AggBucket): { rs: number | null; qtd: number | null } {
  const rs = b.rs12mAnterior > 0 ? (b.rs12m / b.rs12mAnterior - 1) * 100 : null;
  const qtd = b.qtd12mAnterior > 0 ? (b.qtd12m / b.qtd12mAnterior - 1) * 100 : null;
  return { rs, qtd };
}

function applySort(rows: LinhaPivot[], sort: MixSort | null, metricaPrim: MixMetrica): LinhaPivot[] {
  if (!sort) return rows;
  const sign = sort.dir === "asc" ? 1 : -1;
  // Sort keys aceitam sufixo __rs / __qtd / __pct para fixar métrica.
  // Exemplo: "2025-12__qtd" ordena pelo Un de dez/25; "__total__rs" pelo Total R$.
  function splitMetric(key: string): { base: string; metric: MixMetrica | null } {
    const m = /__(rs|qtd|pct)$/.exec(key);
    if (!m) return { base: key, metric: null };
    return { base: key.slice(0, m.index), metric: m[1] as MixMetrica };
  }
  const { base, metric: metricSuffix } = splitMetric(sort.by);
  const metric: MixMetrica = metricSuffix ?? metricaPrim;
  const getKey = (r: LinhaPivot): number | string => {
    if (base === "__produto__") return r.label.toLowerCase();
    if (base === "__total__") return r.total[metric] ?? 0;
    if (base === "__tend__") return r.tend2026?.[metric] ?? -Infinity;
    if (base === "__vs__") {
      const v = r.vs2025?.[metric === "qtd" ? "qtd" : "rs"];
      return v ?? -Infinity;
    }
    if (base === "__ticket__") return r.ticketMedio12m ?? -Infinity;
    if (base === "__sem_compra__") return r.diasSemCompra ?? Infinity;
    if (base === "__venda12m__") return r.venda12m[metric === "qtd" ? "qtd" : "rs"] ?? 0;
    if (base === "__cresc12m__") {
      const v = r.cresc12m[metric === "qtd" ? "qtd" : "rs"];
      return v ?? -Infinity;
    }
    // Período (ex.: "2025-12") — base sem sufixo é o colKey real.
    const cell = r.cellsByMetric[base];
    return cell?.[metric] ?? 0;
  };
  return [...rows].sort((a, b) => {
    const va = getKey(a); const vb = getKey(b);
    if (typeof va === "string" && typeof vb === "string") return sign * va.localeCompare(vb);
    return sign * ((va as number) - (vb as number));
  });
}

export function buildRows(
  vendas: VendaLong[],
  filtros: MixFiltros,
  expandidos: Set<string>,
  sort: MixSort | null = null,
  displayMap?: Map<string, string>,
): { rows: LinhaPivot[]; colunas: ColunaPivot[]; total: LinhaPivot } {
  const periodos = expandPeriodos(filtros.periodos);
  const colunas = buildColunas(periodos, filtros.granularidade);
  const periodosSet = new Set(periodos.map((p) => `${p.ano}-${p.mes}`));
  const today = new Date();
  const doy = dayOfYear(today);
  const metricaPrim = metricaPrincipal(filtros);

  const buckets = {
    geral: emptyBucket(),
    pai: new Map<string, AggBucket>(),
    filho: new Map<string, AggBucket>(),
    sku: new Map<string, AggBucket>(),
  };
  const meta = {
    filhoLabel: new Map<string, string>(),
    skuLabel: new Map<string, string>(),
  };

  for (const v of vendas) {
    const inPeriodo = periodosSet.has(`${v.ano}-${v.mes}`);
    const colKey = colKeyForVenda(v, filtros.granularidade);
    const paiKey = v.grupo_pai;
    const filhoKey = `${paiKey}>${v.grupo_filho}`;
    const skuKey = `${filhoKey}>${v.cod_produto}`;

    // Tendência/vs/ticket usam dados fora do período do filtro (2025/2026/12m).
    // bumpBucket trata as agregações específicas internamente; só conta cells
    // se estiver no período.
    const rs = inPeriodo ? v.valor : 0;
    const qtd = inPeriodo ? v.qtd : 0;

    bumpBucket(buckets.geral, colKey, rs, qtd, v.ano, v.mes, today);
    if (!buckets.pai.has(paiKey)) buckets.pai.set(paiKey, emptyBucket());
    bumpBucket(buckets.pai.get(paiKey)!, colKey, rs, qtd, v.ano, v.mes, today);
    if (!buckets.filho.has(filhoKey)) buckets.filho.set(filhoKey, emptyBucket());
    bumpBucket(buckets.filho.get(filhoKey)!, colKey, rs, qtd, v.ano, v.mes, today);
    if (!buckets.sku.has(skuKey)) buckets.sku.set(skuKey, emptyBucket());
    bumpBucket(buckets.sku.get(skuKey)!, colKey, rs, qtd, v.ano, v.mes, today);

    meta.filhoLabel.set(filhoKey, v.grupo_filho);
    meta.skuLabel.set(skuKey, v.nome_produto || v.cod_produto);
  }

  // Total geral por coluna em RS — base do %
  const colTotaisRs = new Map<string, number>();
  buckets.geral.cells.forEach((c, k) => colTotaisRs.set(k, c.rs));
  const totalGeralRs = buckets.geral.totalRs;

  function buildCellsByMetric(b: AggBucket): Record<string, MetricaValores> {
    const out: Record<string, MetricaValores> = {};
    b.cells.forEach((c, k) => {
      const totalCol = colTotaisRs.get(k) ?? 0;
      out[k] = { rs: c.rs, qtd: c.qtd, pct: pctSafe(c.rs, totalCol) };
    });
    return out;
  }

  function lineFromBucket(
    b: AggBucket,
    base: Pick<LinhaPivot, "key" | "nivel" | "parentKey" | "scope" | "scopeValue" | "label">,
    isSku: boolean,
  ): LinhaPivot {
    const tv = calcTendVs(b, doy);
    return {
      ...base,
      cellsByMetric: buildCellsByMetric(b),
      total: buildMetricaValores(b.totalRs, b.totalQtd, totalGeralRs),
      ultimaCompra: ultimaCompraISO(b.ultimaIdx),
      diasSemCompra: diasDesde(b.ultimaIdx),
      tend2026: tv.tend,
      vs2025: tv.vs,
      fat2025Bruto: { rs: b.fat2025Rs, qtd: b.fat2025Qtd },
      fat2026Bruto: { rs: b.ytd2026Rs, qtd: b.ytd2026Qtd },
      ticketMedio12m: isSku ? ticketMedio(b) : null,
      venda12m:         { rs: b.rs12m,         qtd: b.qtd12m,         pct: 0 },
      venda12mAnterior: { rs: b.rs12mAnterior, qtd: b.qtd12mAnterior, pct: 0 },
      cresc12m: calcCresc12m(b),
    };
  }

  // Sprint 2.6c — filtro DETALHE controla quais níveis aparecem.
  // Default = todos os 3.
  const detalhe = filtros.detalhe && filtros.detalhe.length > 0
    ? filtros.detalhe
    : (["pai", "filho", "sku"] as const);
  const showPai = detalhe.includes("pai");
  const showFilho = detalhe.includes("filho");
  const showSku = detalhe.includes("sku");
  // Quando o usuário está em modo "default" (3 níveis), respeitamos `expandidos`.
  // Em qualquer recorte custom, auto-expandimos pra mostrar o que ele pediu.
  const modoDefault = showPai && showFilho && showSku;

  // Modo "só SKU": lista flat global ordenada por total.rs desc (ignora hierarquia).
  if (showSku && !showPai && !showFilho) {
    const flat: LinhaPivot[] = [];
    buckets.sku.forEach((b, key) => {
      const label = meta.skuLabel.get(key) ?? key;
      const cod = key.split(">").slice(-1)[0];
      const filhoKey = key.split(">").slice(0, 2).join(">");
      flat.push(
        lineFromBucket(b, {
          key, nivel: 3, parentKey: filhoKey,
          scope: "sku", scopeValue: cod, label,
        }, true),
      );
    });
    const flatOrd = sort
      ? applySort(flat, sort, metricaPrim)
      : flat.sort((a, b) => b.total.rs - a.total.rs);
    const total = lineFromBucket(buckets.geral, {
      key: "__total__", nivel: 1, parentKey: null,
      scope: "total", scopeValue: "__total__", label: "Total",
    }, false);
    return { rows: flatOrd, colunas, total };
  }

  const linhasPai: LinhaPivot[] = ORDEM_GRUPO_PAI
    .filter((p) => buckets.pai.has(p))
    .map((p) =>
      lineFromBucket(
        buckets.pai.get(p)!,
        {
          key: p, nivel: 1, parentKey: null,
          scope: "grupo_pai", scopeValue: p,
          label: paiDisplayLabel(p, displayMap),
        },
        false,
      ),
    );

  const paiOrdenado = applySort(linhasPai, sort, metricaPrim);

  const rows: LinhaPivot[] = [];
  for (const linhaPai of paiOrdenado) {
    if (showPai) rows.push(linhaPai);
    if (!showFilho && !showSku) continue;
    if (modoDefault && !expandidos.has(linhaPai.key)) continue;
    const filhos: LinhaPivot[] = [];
    buckets.filho.forEach((b, key) => {
      if (!key.startsWith(`${linhaPai.key}>`)) return;
      const rawLabel = meta.filhoLabel.get(key) ?? key;
      const label = displayMap?.get(rawLabel.toUpperCase().trim()) ?? rawLabel;
      filhos.push(
        lineFromBucket(b, {
          key, nivel: 2, parentKey: linhaPai.key,
          scope: "grupo_filho", scopeValue: rawLabel, label,
        }, false),
      );
    });
    const filhosOrd = sort
      ? applySort(filhos, sort, metricaPrim)
      : filhos.sort((a, b) => b.total.rs - a.total.rs);
    for (const f of filhosOrd) {
      if (showFilho) rows.push(f);
      if (!showSku) continue;
      if (modoDefault && !expandidos.has(f.key)) continue;
      const skus: LinhaPivot[] = [];
      buckets.sku.forEach((b, key) => {
        if (!key.startsWith(`${f.key}>`)) return;
        const label = meta.skuLabel.get(key) ?? key;
        const cod = key.split(">").slice(-1)[0];
        skus.push(
          lineFromBucket(b, {
            key, nivel: 3, parentKey: f.key,
            scope: "sku", scopeValue: cod, label,
          }, true),
        );
      });
      const skusOrd = sort
        ? applySort(skus, sort, metricaPrim)
        : skus.sort((a, b) => b.total.rs - a.total.rs);
      rows.push(...skusOrd);
    }
  }

  const total = lineFromBucket(buckets.geral, {
    key: "__total__", nivel: 1, parentKey: null,
    scope: "total", scopeValue: "__total__", label: "Total",
  }, false);

  return { rows, colunas, total };
}

// ============================================================
// 4) Helpers
// ============================================================
export function cagr(valorInicial: number | null, valorFinal: number | null, anos: number): number | null {
  if (valorInicial == null || valorFinal == null) return null;
  if (valorInicial <= 0 || valorFinal <= 0 || anos <= 0) return null;
  return (Math.pow(valorFinal / valorInicial, 1 / anos) - 1) * 100;
}

export function serieDoEscopo(
  vendas: VendaLong[],
  filtros: MixFiltros,
  rowKey: string | null,
  metrica: MixMetrica = metricaPrincipal(filtros),
): Array<{ key: string; label: string; valor: number }> {
  const periodos = expandPeriodos(filtros.periodos);
  const colunas = buildColunas(periodos, filtros.granularidade);
  const map = new Map<string, { rs: number; qtd: number }>();
  const colTotais = new Map<string, number>();

  function matches(v: VendaLong): boolean {
    if (!rowKey || rowKey === "__total__") return true;
    const parts = rowKey.split(">");
    if (parts.length === 1) return v.grupo_pai === parts[0];
    if (parts.length === 2) return v.grupo_pai === parts[0] && v.grupo_filho === parts[1];
    return v.grupo_pai === parts[0] && v.grupo_filho === parts[1] && v.cod_produto === parts[2];
  }

  const periodosSet = new Set(periodos.map((p) => `${p.ano}-${p.mes}`));
  for (const v of vendas) {
    if (!periodosSet.has(`${v.ano}-${v.mes}`)) continue;
    const k = colKeyForVenda(v, filtros.granularidade);
    if (metrica === "pct") {
      colTotais.set(k, (colTotais.get(k) ?? 0) + v.valor);
    }
    if (!matches(v)) continue;
    const cur = map.get(k) ?? { rs: 0, qtd: 0 };
    cur.rs += v.valor; cur.qtd += v.qtd;
    map.set(k, cur);
  }
  return colunas.map((c) => {
    const cur = map.get(c.key) ?? { rs: 0, qtd: 0 };
    let valor: number;
    if (metrica === "qtd") valor = cur.qtd;
    else if (metrica === "pct") valor = pctSafe(cur.rs, colTotais.get(c.key) ?? 0);
    else valor = cur.rs;
    return { key: c.key, label: c.label, valor };
  });
}

export function colorDiasSemCompra(d: number | null): "verde" | "ambar" | "vermelho" | "cinza" {
  if (d == null) return "cinza";
  if (d <= 30) return "verde";
  if (d <= 60) return "ambar";
  return "vermelho";
}

export function colorVs2025(pct: number | null): "verde" | "ambar" | "vermelho" | "cinza" {
  if (pct == null) return "cinza";
  if (pct > 5) return "verde";
  if (pct >= -5) return "ambar";
  return "vermelho";
}

export function suggestGranularidade(periodos: string[]): MixGranularidade {
  const expanded = expandPeriodos(periodos);
  if (expanded.length === 0) return "ano";
  const anos = new Set(expanded.map((p) => p.ano)).size;
  if (anos > 1) return "ano";
  if (expanded.length >= 6) return "tri";
  return "mes";
}

export function defaultPeriodos(): string[] {
  const a = new Date().getFullYear();
  return [String(a - 1), String(a)];
}
