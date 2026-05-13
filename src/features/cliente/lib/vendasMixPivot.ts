// Funções puras pra Sprint 2 — Tab Vendas & Mix.
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
  label: string;   // "2025" | "T1" | "Jan"
  ano: number;
  bucket: number;  // 0=ano cheio | 1..4=tri | 1..12=mes
  granularidade: MixGranularidade;
  isAtual: boolean;
};

export type LinhaPivot = {
  key: string;          // rowKey hierárquico, ex "papeis>SLIM>123"
  nivel: 1 | 2 | 3;
  parentKey: string | null;
  scope: "grupo_pai" | "grupo_filho" | "sku";
  scopeValue: string;
  label: string;
  cells: Record<string, number>; // key da coluna → valor
  total: number;
  ultimaCompra: string | null; // "YYYY-MM-01"
  diasSemCompra: number | null;
};

const MES_LABEL = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// Mês → trimestre (1..4)
function triDoMes(m: number): number {
  return Math.ceil(m / 3);
}

// =========================================================================
// 1) Resolver chaves do tree de período em pares {ano, mes}
// =========================================================================
export function expandPeriodos(
  periodos: string[],
  anosDisponiveis: number[] = rangeAnos(),
): Periodo[] {
  if (periodos.length === 0) return [];
  const out = new Set<string>(); // "ano-mes"
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

// =========================================================================
// 2) Construir colunas do pivot conforme granularidade
// =========================================================================
export function buildColunas(
  periodos: Periodo[],
  granularidade: MixGranularidade,
): ColunaPivot[] {
  if (periodos.length === 0) return [];
  const anoAtual = new Date().getFullYear();
  const seen = new Set<string>();
  const cols: ColunaPivot[] = [];
  for (const p of periodos) {
    let key: string;
    let label: string;
    let bucket: number;
    if (granularidade === "ano") {
      key = String(p.ano);
      label = String(p.ano);
      bucket = 0;
    } else if (granularidade === "tri") {
      const t = triDoMes(p.mes);
      key = `${p.ano}-T${t}`;
      label = `${p.ano} T${t}`;
      bucket = t;
    } else {
      key = `${p.ano}-${String(p.mes).padStart(2, "0")}`;
      label = `${MES_LABEL[p.mes - 1]}/${String(p.ano).slice(2)}`;
      bucket = p.mes;
    }
    if (!seen.has(key)) {
      seen.add(key);
      cols.push({
        key,
        label,
        ano: p.ano,
        bucket,
        granularidade,
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

function metricaValue(v: VendaLong, m: MixMetrica): number {
  if (m === "qtd") return v.qtd;
  return v.valor; // pct é normalizado depois
}

// =========================================================================
// 3) Agregação hierárquica + linhas planas conforme drill
// =========================================================================
const ORDEM_GRUPO_PAI: GrupoPaiKey[] = ["papeis", "filtros", "piteiras", "outros"];

const LABEL_GRUPO_PAI: Record<GrupoPaiKey, string> = {
  papeis: "Papéis",
  filtros: "Filtros",
  piteiras: "Piteiras",
  outros: "Outros",
};

type AggBucket = {
  cells: Map<string, number>;
  total: number;
  ultimaIdx: number; // ano*12+mes da última compra
};

function emptyBucket(): AggBucket {
  return { cells: new Map(), total: 0, ultimaIdx: -1 };
}

function bumpBucket(b: AggBucket, colKey: string, value: number, ano: number, mes: number) {
  if (value !== 0) {
    b.cells.set(colKey, (b.cells.get(colKey) ?? 0) + value);
    b.total += value;
  }
  const idx = ano * 12 + mes;
  if (value !== 0 && idx > b.ultimaIdx) b.ultimaIdx = idx;
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

export function buildRows(
  vendas: VendaLong[],
  filtros: MixFiltros,
  expandidos: Set<string>,
): { rows: LinhaPivot[]; colunas: ColunaPivot[]; total: LinhaPivot } {
  const periodos = expandPeriodos(filtros.periodos);
  const colunas = buildColunas(periodos, filtros.granularidade);
  const periodosSet = new Set(periodos.map((p) => `${p.ano}-${p.mes}`));

  const buckets = {
    geral: emptyBucket(),
    pai: new Map<string, AggBucket>(),
    filho: new Map<string, AggBucket>(),  // key = "pai>filho"
    sku: new Map<string, AggBucket>(),    // key = "pai>filho>cod"
  };

  const meta = {
    filhoLabel: new Map<string, string>(), // "pai>filho" -> label
    skuLabel: new Map<string, string>(),   // "pai>filho>cod" -> label
    skuPaiFilho: new Map<string, { pai: GrupoPaiKey; filho: string }>(),
  };

  for (const v of vendas) {
    if (!periodosSet.has(`${v.ano}-${v.mes}`)) continue;
    const colKey = colKeyForVenda(v, filtros.granularidade);
    const value = metricaValue(v, filtros.metrica);
    const paiKey = v.grupo_pai;
    const filhoKey = `${paiKey}>${v.grupo_filho}`;
    const skuKey = `${filhoKey}>${v.cod_produto}`;

    bumpBucket(buckets.geral, colKey, value, v.ano, v.mes);
    if (!buckets.pai.has(paiKey)) buckets.pai.set(paiKey, emptyBucket());
    bumpBucket(buckets.pai.get(paiKey)!, colKey, value, v.ano, v.mes);
    if (!buckets.filho.has(filhoKey)) buckets.filho.set(filhoKey, emptyBucket());
    bumpBucket(buckets.filho.get(filhoKey)!, colKey, value, v.ano, v.mes);
    if (!buckets.sku.has(skuKey)) buckets.sku.set(skuKey, emptyBucket());
    bumpBucket(buckets.sku.get(skuKey)!, colKey, value, v.ano, v.mes);

    meta.filhoLabel.set(filhoKey, v.grupo_filho);
    meta.skuLabel.set(skuKey, v.nome_produto || v.cod_produto);
    meta.skuPaiFilho.set(skuKey, { pai: paiKey, filho: v.grupo_filho });
  }

  // Normalização % do mix (apenas pro front: dividir cada cell pelo total da coluna no geral)
  const normalizar = filtros.metrica === "pct";
  const colTotais = new Map<string, number>();
  if (normalizar) {
    buckets.geral.cells.forEach((v, k) => colTotais.set(k, v));
  }
  function normCells(b: AggBucket): Record<string, number> {
    const out: Record<string, number> = {};
    b.cells.forEach((v, k) => {
      const total = colTotais.get(k) ?? 0;
      out[k] = total > 0 ? (v / total) * 100 : 0;
    });
    return out;
  }
  function normTotal(b: AggBucket): number {
    const total = buckets.geral.total;
    return total > 0 ? (b.total / total) * 100 : 0;
  }
  function asCells(b: AggBucket): Record<string, number> {
    const out: Record<string, number> = {};
    b.cells.forEach((v, k) => (out[k] = v));
    return out;
  }

  const linhasPai: LinhaPivot[] = ORDEM_GRUPO_PAI
    .filter((p) => buckets.pai.has(p))
    .map<LinhaPivot>((p) => {
      const b = buckets.pai.get(p)!;
      return {
        key: p,
        nivel: 1,
        parentKey: null,
        scope: "grupo_pai",
        scopeValue: p,
        label: LABEL_GRUPO_PAI[p],
        cells: normalizar ? normCells(b) : asCells(b),
        total: normalizar ? normTotal(b) : b.total,
        ultimaCompra: ultimaCompraISO(b.ultimaIdx),
        diasSemCompra: diasDesde(b.ultimaIdx),
      };
    });

  const rows: LinhaPivot[] = [];
  for (const linhaPai of linhasPai) {
    rows.push(linhaPai);
    if (!expandidos.has(linhaPai.key)) continue;
    // Filhos do pai
    const filhos: LinhaPivot[] = [];
    buckets.filho.forEach((b, key) => {
      if (!key.startsWith(`${linhaPai.key}>`)) return;
      const label = meta.filhoLabel.get(key) ?? key;
      filhos.push({
        key,
        nivel: 2,
        parentKey: linhaPai.key,
        scope: "grupo_filho",
        scopeValue: label,
        label,
        cells: normalizar ? normCells(b) : asCells(b),
        total: normalizar ? normTotal(b) : b.total,
        ultimaCompra: ultimaCompraISO(b.ultimaIdx),
        diasSemCompra: diasDesde(b.ultimaIdx),
      });
    });
    filhos.sort((a, b) => b.total - a.total);
    for (const f of filhos) {
      rows.push(f);
      if (!expandidos.has(f.key)) continue;
      const skus: LinhaPivot[] = [];
      buckets.sku.forEach((b, key) => {
        if (!key.startsWith(`${f.key}>`)) return;
        const label = meta.skuLabel.get(key) ?? key;
        const cod = key.split(">").slice(-1)[0];
        skus.push({
          key,
          nivel: 3,
          parentKey: f.key,
          scope: "sku",
          scopeValue: cod,
          label,
          cells: normalizar ? normCells(b) : asCells(b),
          total: normalizar ? normTotal(b) : b.total,
          ultimaCompra: ultimaCompraISO(b.ultimaIdx),
          diasSemCompra: diasDesde(b.ultimaIdx),
        });
      });
      skus.sort((x, y) => y.total - x.total);
      rows.push(...skus);
    }
  }

  const total: LinhaPivot = {
    key: "__total__",
    nivel: 1,
    parentKey: null,
    scope: "grupo_pai",
    scopeValue: "__total__",
    label: "Total",
    cells: normalizar
      ? Object.fromEntries(colunas.map((c) => [c.key, 100]))
      : asCells(buckets.geral),
    total: normalizar ? 100 : buckets.geral.total,
    ultimaCompra: ultimaCompraISO(buckets.geral.ultimaIdx),
    diasSemCompra: diasDesde(buckets.geral.ultimaIdx),
  };

  return { rows, colunas, total };
}

// =========================================================================
// 4) CAGR — só calcula se 1º ano e último ano forem positivos
// =========================================================================
export function cagr(valorInicial: number | null, valorFinal: number | null, anos: number): number | null {
  if (valorInicial == null || valorFinal == null) return null;
  if (valorInicial <= 0 || valorFinal <= 0 || anos <= 0) return null;
  return (Math.pow(valorFinal / valorInicial, 1 / anos) - 1) * 100;
}

// =========================================================================
// 5) Série temporal pra gráfico contextual
// =========================================================================
export function serieDoEscopo(
  vendas: VendaLong[],
  filtros: MixFiltros,
  rowKey: string | null,
): Array<{ key: string; label: string; valor: number }> {
  const periodos = expandPeriodos(filtros.periodos);
  const colunas = buildColunas(periodos, filtros.granularidade);
  const map = new Map<string, number>();

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
    if (!matches(v)) continue;
    const k = colKeyForVenda(v, filtros.granularidade);
    const value = metricaValue(v, filtros.metrica);
    map.set(k, (map.get(k) ?? 0) + value);
  }
  return colunas.map((c) => ({ key: c.key, label: c.label, valor: map.get(c.key) ?? 0 }));
}

// =========================================================================
// 6) Helpers
// =========================================================================
export function colorDiasSemCompra(d: number | null): "verde" | "ambar" | "vermelho" | "cinza" {
  if (d == null) return "cinza";
  if (d <= 30) return "verde";
  if (d <= 60) return "ambar";
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