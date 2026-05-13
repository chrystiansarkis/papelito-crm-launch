import { useMemo } from "react";
import { CardWrap } from "../visaoGeral/CardWrap";
import { formatMoneyShort } from "@/lib/format";
import type { ClienteFichaKpi, GrupoPaiKey, VendaLong } from "../../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Customized,
} from "recharts";

const ANOS = [2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;
const ANO_ATUAL = new Date().getFullYear();
const MES_PT_ABREV = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

const GRUPO_LABEL: Record<string, string> = {
  papeis: "Papéis", filtros: "Filtros", piteiras: "Piteiras", outros: "Outros",
};

type BreakdownItem = { grupo: GrupoPaiKey; valor: number; share: number };

// =====================================================================
// Sprint 2.6c — Stats por ano (alimentam tooltip enriquecido).
// =====================================================================
type AnoStats = {
  realizado: number;
  vsAnterior: number | null;
  picoMes: { mes: number; valor: number } | null;
  valeMes: { mes: number; valor: number } | null;
  q4Share: number | null;
  ytd: number | null;
  ytdMesmoPeriodoAnterior: number | null;
  ritmo: number | null;
  breakdown: BreakdownItem[];
};

function buildStatsByAno(
  vendas: VendaLong[],
  kpi: ClienteFichaKpi,
  hoje = new Date(),
): Map<number, AnoStats> {
  const yearNow = hoje.getFullYear();
  const monthNow = hoje.getMonth() + 1; // 1..12
  // ano -> mes -> valor (do vendasLong)
  const byYearMonth = new Map<number, Map<number, number>>();
  // ano -> grupo_pai -> valor
  const byYearGrupo = new Map<number, Map<GrupoPaiKey, number>>();
  for (const v of vendas) {
    const ano = v.ano;
    const mes = v.mes;
    if (!ano || !mes) continue;
    if (!byYearMonth.has(ano)) byYearMonth.set(ano, new Map());
    const inner = byYearMonth.get(ano)!;
    inner.set(mes, (inner.get(mes) ?? 0) + v.valor);
    if (!byYearGrupo.has(ano)) byYearGrupo.set(ano, new Map());
    const g = byYearGrupo.get(ano)!;
    g.set(v.grupo_pai, (g.get(v.grupo_pai) ?? 0) + v.valor);
  }

  // realizado vem do kpi (sempre disponível, mesmo sem vendasLong).
  const realizadoDoKpi: Record<number, number> = {
    2020: kpi.fat_2020 ?? 0, 2021: kpi.fat_2021 ?? 0, 2022: kpi.fat_2022 ?? 0,
    2023: kpi.fat_2023 ?? 0, 2024: kpi.fat_2024 ?? 0, 2025: kpi.fat_2025 ?? 0,
    2026: kpi.fat_2026 ?? 0,
  };
  function totalAnoVL(ano: number, ateMes = 12): number {
    const inner = byYearMonth.get(ano);
    if (!inner) return 0;
    let t = 0;
    for (let m = 1; m <= ateMes; m++) t += inner.get(m) ?? 0;
    return t;
  }
  const out = new Map<number, AnoStats>();
  for (const ano of ANOS) {
    const inner = byYearMonth.get(ano);
    const realizado = realizadoDoKpi[ano] ?? 0;
    const ant = realizadoDoKpi[ano - 1] ?? 0;
    const vsAnterior = ant > 0 ? (realizado / ant - 1) * 100 : null;
    let pico: { mes: number; valor: number } | null = null;
    let vale: { mes: number; valor: number } | null = null;
    if (inner) {
      inner.forEach((valor, mes) => {
        if (valor > 0 && (!pico || valor > pico.valor)) pico = { mes, valor };
        if (valor > 0 && (!vale || valor < vale.valor)) vale = { mes, valor };
      });
    }
    const q4 = (inner?.get(10) ?? 0) + (inner?.get(11) ?? 0) + (inner?.get(12) ?? 0);
    const totalVL = totalAnoVL(ano);
    const q4Share = totalVL > 0 ? (q4 / totalVL) * 100 : null;
    let ytd: number | null = null;
    let ytdAnt: number | null = null;
    let ritmo: number | null = null;
    if (ano === yearNow) {
      ytd = totalAnoVL(ano, monthNow) || realizado;
      ytdAnt = totalAnoVL(ano - 1, monthNow);
      ritmo = ytdAnt && ytdAnt > 0 ? (ytd / ytdAnt - 1) * 100 : null;
    }
    const grupos = byYearGrupo.get(ano);
    let breakdown: BreakdownItem[] = [];
    if (grupos) {
      const totalGrupos = Array.from(grupos.values()).reduce((a, b) => a + b, 0);
      breakdown = Array.from(grupos.entries())
        .filter(([, v]) => v > 0)
        .map(([grupo, valor]) => ({
          grupo,
          valor,
          share: totalGrupos > 0 ? (valor / totalGrupos) * 100 : 0,
        }))
        .sort((a, b) => b.valor - a.valor);
    }
    out.set(ano, {
      realizado, vsAnterior, picoMes: pico, valeMes: vale, q4Share,
      ytd, ytdMesmoPeriodoAnterior: ytdAnt, ritmo, breakdown,
    });
  }
  return out;
}

// =====================================================================
// Tooltip custom enriquecido
// =====================================================================
function CustomTooltip({
  active, payload, label, statsByAno, tendencia2026,
}: {
  active?: boolean;
  payload?: Array<{ payload: { ano: string } }>;
  label?: string;
  statsByAno: Map<number, AnoStats>;
  tendencia2026: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const ano = Number(label);
  const s = statsByAno.get(ano);
  if (!s) return null;
  const isAtual = ano === ANO_ATUAL;
  return (
    <div className="bg-paper border border-gray-line rounded shadow-md px-3 py-2 text-[11px] min-w-[220px]">
      <div className="font-semibold text-ink text-[12px]">
        {ano}{isAtual ? " · em curso" : ""}
      </div>
      <div className="border-b border-gray-line my-1" />
      {isAtual ? (
        <>
          <div className="flex justify-between">
            <span className="text-ink-soft">Realizado</span>
            <span className="tabular-nums text-ink">
              {formatMoneyShort(s.ytd ?? 0)} <span className="text-ink-soft">(YTD {MES_PT_ABREV[new Date().getMonth()]}/{String(ano).slice(2)})</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Projetado</span>
            <span className="tabular-nums text-ink">{formatMoneyShort(tendencia2026)}</span>
          </div>
          {s.vsAnterior != null && (
            <div className="flex justify-between mt-1">
              <span className="text-ink-soft">vs {ano - 1}</span>
              <span className={`tabular-nums ${s.vsAnterior >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {s.vsAnterior >= 0 ? "+" : ""}{s.vsAnterior.toFixed(0)}% {s.vsAnterior >= 0 ? "↑" : "↓"}
              </span>
            </div>
          )}
          {s.ritmo != null && (
            <div className="text-ink-soft mt-1 italic">
              Ritmo {s.ritmo >= 0 ? "+" : ""}{s.ritmo.toFixed(0)}% vs mesmo período em {ano - 1}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between">
            <span className="text-ink-soft">Realizado</span>
            <span className="tabular-nums text-ink">{formatMoneyShort(s.realizado)}</span>
          </div>
          {s.vsAnterior != null && (
            <div className="flex justify-between">
              <span className="text-ink-soft">vs {ano - 1}</span>
              <span className={`tabular-nums ${s.vsAnterior >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {s.vsAnterior >= 0 ? "+" : ""}{s.vsAnterior.toFixed(0)}% {s.vsAnterior >= 0 ? "↑" : "↓"}
              </span>
            </div>
          )}
          {s.picoMes && (
            <div className="text-ink-soft mt-1">
              Pico mensal {MES_PT_ABREV[s.picoMes.mes - 1]}/{String(ano).slice(2)} ({formatMoneyShort(s.picoMes.valor)})
            </div>
          )}
          {s.valeMes && s.valeMes.mes !== s.picoMes?.mes && (
            <div className="text-ink-soft">
              Vale {MES_PT_ABREV[s.valeMes.mes - 1]}/{String(ano).slice(2)} ({formatMoneyShort(s.valeMes.valor)})
            </div>
          )}
          {s.q4Share != null && s.q4Share > 0 && (
            <div className="text-ink-soft">
              Q4 do ano {s.q4Share.toFixed(0)}% das vendas
            </div>
          )}
        </>
      )}
      {s.breakdown.length > 0 && (
        <>
          <div className="border-b border-gray-line my-1" />
          <div className="text-ink-soft text-[10px] uppercase tracking-wide mb-0.5">
            Por categoria
          </div>
          {s.breakdown.map((b) => (
            <div key={b.grupo} className="flex justify-between items-baseline">
              <span className="text-ink">• {GRUPO_LABEL[b.grupo] ?? b.grupo}</span>
              <span className="tabular-nums text-ink">
                {formatMoneyShort(b.valor)}{" "}
                <span className="text-ink-soft">{b.share.toFixed(0)}%</span>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// =====================================================================
// Anotação +26% / -X% / ≈ entre as barras 2025 e 2026, via Customized
// =====================================================================
type CustomizedProps = {
  formattedGraphicalItems?: Array<{
    props?: { data?: Array<{ ano: string; valorTotal: number }> };
    item?: { props?: { dataKey?: string } };
  }>;
  xAxisMap?: Record<string | number, { scale?: (v: string) => number }>;
  yAxisMap?: Record<string | number, { scale?: (v: number) => number }>;
};
function AnotacaoCrescimento(props: CustomizedProps) {
  const { xAxisMap, yAxisMap, formattedGraphicalItems } = props;
  if (!xAxisMap || !yAxisMap || !formattedGraphicalItems?.length) return null;
  const xAxis = xAxisMap[Object.keys(xAxisMap)[0]];
  const yAxis = yAxisMap[Object.keys(yAxisMap)[0]];
  if (!xAxis?.scale || !yAxis?.scale) return null;
  const data = formattedGraphicalItems[0]?.props?.data;
  if (!data) return null;
  const r2025 = data.find((d) => d.ano === "2025")?.valorTotal ?? 0;
  const r2026 = data.find((d) => d.ano === "2026")?.valorTotal ?? 0;
  if (r2025 <= 0 || r2026 <= 0) return null;
  const pct = (r2026 / r2025 - 1) * 100;
  let cor = "#999"; let texto = "≈";
  if (pct > 5) { cor = "#15803D"; texto = `↑ +${pct.toFixed(0)}%`; }
  else if (pct < -5) { cor = "#B91C1C"; texto = `↓ ${pct.toFixed(0)}%`; }
  let x2025: number, x2026: number;
  try {
    x2025 = xAxis.scale("2025") as number;
    x2026 = xAxis.scale("2026") as number;
  } catch { return null; }
  if (x2025 == null || x2026 == null || isNaN(x2025) || isNaN(x2026)) return null;
  const x = (x2025 + x2026) / 2;
  const y = (yAxis.scale(Math.max(r2025, r2026)) as number) - 12;
  if (isNaN(y)) return null;
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={11} fontWeight={600} fill={cor}>
      {texto}
    </text>
  );
}

// =====================================================================
// Card principal
// =====================================================================
export function FaturamentoAnualCard({
  kpi, vendasLong, isLoading,
}: {
  kpi: ClienteFichaKpi | null;
  vendasLong?: VendaLong[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <CardWrap title="Faturamento anual">
        <div className="h-48 animate-pulse bg-gray-soft rounded" />
      </CardWrap>
    );
  }
  if (!kpi) {
    return (
      <CardWrap title="Faturamento anual">
        <div className="text-sm text-gray-faint">Sem dados.</div>
      </CardWrap>
    );
  }

  const valores: Record<number, number | null> = {
    2020: kpi.fat_2020, 2021: kpi.fat_2021, 2022: kpi.fat_2022, 2023: kpi.fat_2023,
    2024: kpi.fat_2024, 2025: kpi.fat_2025, 2026: kpi.fat_2026,
  };
  const tendencia = kpi.tendencia_2026 ?? kpi.fat_2026 ?? 0;
  const fechado2025 = kpi.fat_2025 ?? 0;
  const realizado2026 = kpi.fat_2026 ?? 0;

  const data = ANOS.map((ano) => {
    const v = valores[ano] ?? 0;
    const isAtual = ano === ANO_ATUAL;
    const projecaoRestante = isAtual && tendencia > v ? tendencia - v : 0;
    return {
      ano: String(ano),
      realizado: v,
      projecaoRestante,
      valorTotal: isAtual ? Math.max(v, tendencia) : v,
      isAtual,
    };
  });

  const statsByAno = useMemo(
    () => buildStatsByAno(vendasLong ?? [], kpi, new Date()),
    [vendasLong, kpi],
  );
  const stats2026 = statsByAno.get(ANO_ATUAL);

  const ydyPct = fechado2025 > 0 ? ((tendencia / fechado2025) - 1) * 100 : null;
  const ytdLabel = `YTD ${MES_PT_ABREV[new Date().getMonth()]}/${String(ANO_ATUAL).slice(2)}`;

  // Mini-KPIs (4d) — substituem o subtitle.
  return (
    <CardWrap title="Faturamento anual">
      <div className="grid grid-cols-3 gap-4 px-1 pb-4 border-b border-gray-line">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-soft">Fechado 2025</div>
          <div className="text-xl font-semibold tabular-nums text-ink mt-0.5">
            {formatMoneyShort(fechado2025)}
          </div>
          <div className="text-[11px] text-ink-soft mt-0.5">&nbsp;</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-soft">Realizado 2026</div>
          <div className="text-xl font-semibold tabular-nums text-ink mt-0.5">
            {formatMoneyShort(realizado2026)}
          </div>
          <div className="text-[11px] text-ink-soft mt-0.5">{ytdLabel}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-soft">Projeção 2026</div>
          <div className="text-xl font-semibold tabular-nums text-ink mt-0.5">
            {formatMoneyShort(tendencia)}
          </div>
          <div className="mt-0.5">
            {ydyPct != null && (
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  ydyPct > 5 ? "bg-emerald-50 text-emerald-700"
                  : ydyPct < -5 ? "bg-red-50 text-red-700"
                  : "bg-gray-soft text-gray-faint"
                }`}
              >
                {ydyPct >= 0 ? "+" : ""}{ydyPct.toFixed(0)}% vs 2025
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-60 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 60, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="ano"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#3B3B3B" }}
            />
            <YAxis hide />
            {fechado2025 > 0 && (
              <ReferenceLine
                y={fechado2025}
                stroke="#999"
                strokeDasharray="3 3"
                label={{
                  value: `2025 ${formatMoneyShort(fechado2025)}`,
                  position: "right",
                  fontSize: 10,
                  fill: "#666",
                }}
              />
            )}
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={
                <CustomTooltip
                  statsByAno={statsByAno}
                  tendencia2026={tendencia}
                />
              }
            />
            {/* 4a — barra base (realizado), sólida pra todos os anos */}
            <Bar dataKey="realizado" stackId="ano" radius={[0, 0, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.ano} fill="#F5C518" />
              ))}
            </Bar>
            {/* 4a — projeção restante empilhada APENAS no ano corrente */}
            <Bar
              dataKey="projecaoRestante"
              stackId="ano"
              fill="#FFF3C4"
              stroke="#F5C518"
              strokeDasharray="4 4"
              radius={[2, 2, 0, 0]}
            />
            {/* 4c — anotação +26% / ≈ / -X% entre as barras 2025 e 2026 */}
            <Customized component={AnotacaoCrescimento} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {stats2026?.ritmo != null && (
        <div className="text-[11px] text-ink-soft text-center pt-1">
          Ritmo {stats2026.ritmo >= 0 ? "+" : ""}{stats2026.ritmo.toFixed(0)}% vs mesmo período em 2025
        </div>
      )}
    </CardWrap>
  );
}
