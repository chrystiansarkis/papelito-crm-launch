import { CardWrap } from "../visaoGeral/CardWrap";
import { formatMoneyShort } from "@/lib/format";
import { cagr } from "../../lib/vendasMixPivot";
import type { ClienteFichaKpi } from "../../types";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  Cell,
} from "recharts";

const ANOS = [2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;
const ANO_ATUAL = new Date().getFullYear();

export function FaturamentoAnualCard({ kpi, isLoading }: { kpi: ClienteFichaKpi | null; isLoading?: boolean }) {
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
    2020: kpi.fat_2020,
    2021: kpi.fat_2021,
    2022: kpi.fat_2022,
    2023: kpi.fat_2023,
    2024: kpi.fat_2024,
    2025: kpi.fat_2025,
    2026: kpi.fat_2026,
  };

  const tendencia = kpi.tendencia_2026 ?? kpi.fat_2026 ?? 0;

  const cagrPct = cagr(kpi.fat_2020, kpi.fat_2025, 5);
  const ydyPct = kpi.fat_2025 && kpi.fat_2025 > 0
    ? ((tendencia / kpi.fat_2025) - 1) * 100
    : null;

  const subtitle = (() => {
    const parts: string[] = [];
    if (cagrPct != null) parts.push(`CAGR ${cagrPct >= 0 ? "+" : ""}${cagrPct.toFixed(1)}% nos últimos 5 anos`);
    if (tendencia > 0) {
      const ydyTxt = ydyPct != null
        ? ` (${ydyPct >= 0 ? "+" : ""}${ydyPct.toFixed(1)}% vs 2025)`
        : "";
      parts.push(`2026 projetada ${formatMoneyShort(tendencia)}${ydyTxt}`);
    }
    return parts.join(" · ");
  })();

  // Dados pro Recharts. 2026 entra com `valor` (realizado YTD) e
  // `valor_projetado` (extrapolado, dashed) — Bar transparente com stroke.
  const data = ANOS.map((ano) => {
    const v = valores[ano] ?? 0;
    const isAtual = ano === ANO_ATUAL;
    return {
      ano: String(ano),
      valor: v,
      // Projeção: só a parte ACIMA do realizado, pra Bar empilhada visual.
      valor_projetado: isAtual && tendencia > v ? tendencia - v : 0,
      isAtual,
      tendenciaAbs: isAtual ? tendencia : null,
    };
  });

  return (
    <CardWrap title="Faturamento anual" subtitle={subtitle || "2020 a 2026 · ano atual em destaque"}>
      <div className="h-60 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="ano"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#3B3B3B" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              formatter={(value: number, name: string) => {
                const label = name === "valor_projetado" ? "Projetado" : "Realizado";
                return [formatMoneyShort(value), label];
              }}
              labelFormatter={(label) => `Ano ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Bar dataKey="valor" stackId="a" radius={[2, 2, 0, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.ano}
                  fill={d.isAtual ? "#161616" : "#F5C518"}
                />
              ))}
              {/* Label só quando NÃO há projeção empilhada */}
              <LabelList
                dataKey="valor"
                position="top"
                formatter={(v: number, _entry: unknown, index: number) => {
                  const row = data[index];
                  if (row?.valor_projetado > 0) return "";
                  return v > 0 ? formatMoneyShort(v) : "";
                }}
                style={{ fontSize: 10, fill: "#3B3B3B" }}
              />
            </Bar>
            <Bar
              dataKey="valor_projetado"
              stackId="a"
              fill="rgba(245,197,24,0.15)"
              stroke="#F5C518"
              strokeDasharray="4 4"
              radius={[2, 2, 0, 0]}
            >
              <LabelList
                dataKey="tendenciaAbs"
                position="top"
                formatter={(v: number | null) =>
                  v != null && v > 0 ? formatMoneyShort(v) : ""
                }
                style={{ fontSize: 10, fill: "#3B3B3B" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardWrap>
  );
}