import { CardWrap } from "../visaoGeral/CardWrap";
import { formatMoneyShort } from "@/lib/format";
import { cagr } from "../../lib/vendasMixPivot";
import type { ClienteFichaKpi } from "../../types";

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
  const max = Math.max(
    ...ANOS.map((a) => valores[a] ?? 0),
    tendencia,
    1,
  );

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

  return (
    <CardWrap title="Faturamento anual" subtitle={subtitle || "2020 a 2026 · ano atual em destaque"}>
      <div className="flex items-end gap-3 h-48 pt-6">
        {ANOS.map((ano) => {
          const v = valores[ano] ?? 0;
          const isAtual = ano === ANO_ATUAL;
          const barH = (v / max) * 100;
          const projH = isAtual && tendencia > v ? (tendencia / max) * 100 : null;
          return (
            <div key={ano} className="flex-1 flex flex-col items-center min-w-0">
              <div className="text-[10px] tabular-nums text-ink-soft mb-1 truncate">
                {v > 0 ? formatMoneyShort(v) : "—"}
              </div>
              <div className="relative w-full flex-1 flex items-end">
                {projH != null && (
                  <div
                    className="absolute inset-x-2 bottom-0 bg-amber-200/60 rounded-t border-t border-dashed border-amber-500"
                    style={{ height: `${projH}%` }}
                    title={`Projeção: ${formatMoneyShort(tendencia)}`}
                  />
                )}
                <div
                  className={`relative w-full rounded-t ${
                    isAtual ? "bg-ink" : "bg-amber-500"
                  }`}
                  style={{ height: `${Math.max(barH, 1)}%` }}
                />
              </div>
              <div className={`text-xs mt-1 ${isAtual ? "text-ink font-medium" : "text-gray-text"}`}>
                {ano}
                {isAtual && <span className="ml-0.5">→</span>}
              </div>
            </div>
          );
        })}
      </div>
    </CardWrap>
  );
}