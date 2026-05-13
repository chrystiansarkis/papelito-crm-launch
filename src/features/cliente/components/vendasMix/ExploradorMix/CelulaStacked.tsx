import { formatMoney } from "@/lib/format";
import type { MetricaValores } from "../../../lib/vendasMixPivot";
import type { MixMetrica } from "../../../types";

function fmtRs(v: number): string {
  if (v === 0) return "—";
  return formatMoney(v);
}
function fmtQtd(v: number): string {
  if (v === 0) return "—";
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} un`;
}
function fmtPct(v: number): string {
  if (v === 0) return "—";
  return `${v.toFixed(1)}%`;
}

const FORMATTERS: Record<MixMetrica, (v: number) => string> = {
  rs: fmtRs, qtd: fmtQtd, pct: fmtPct,
};
const ORDEM: MixMetrica[] = ["rs", "qtd", "pct"];

export function CelulaStacked({
  valores,
  metricas,
}: {
  valores: MetricaValores | null;
  metricas: MixMetrica[];
}) {
  if (!valores) return <span className="text-gray-faint">—</span>;
  const ativas = ORDEM.filter((m) => metricas.includes(m));
  if (ativas.length === 0) return <span>—</span>;
  if (ativas.length === 1) {
    const m = ativas[0];
    return <span className="text-[12px] tabular-nums">{FORMATTERS[m](valores[m])}</span>;
  }
  return (
    <div className="flex flex-col items-end leading-tight">
      {ativas.map((m, i) => (
        <span
          key={m}
          className={
            i === 0
              ? "text-[12px] tabular-nums text-ink"
              : i === 1
                ? "text-[11px] tabular-nums text-ink-soft"
                : "text-[10px] tabular-nums text-gray-faint"
          }
        >
          {FORMATTERS[m](valores[m])}
        </span>
      ))}
    </div>
  );
}
