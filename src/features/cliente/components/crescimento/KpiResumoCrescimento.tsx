// Mitigates: A05 (so renderiza valores ja numericos)
//
// Linha de KPIs do topo da aba Crescimento: receita A vs B, delta R$ e %,
// volume A vs B, ticket medio A vs B.
import { formatMoney } from "@/lib/format";
import type { DecomposicaoCrescimento } from "../../types";

function formatNum(n: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}

function formatPct(p: number | null): string {
  if (p == null) return "—";
  const sign = p >= 0 ? "+" : "";
  return `${sign}${(p * 100).toFixed(1)}%`;
}

function formatDelta(p: number): string {
  const sign = p >= 0 ? "+" : "";
  return `${sign}${formatMoney(p)}`;
}

export function KpiResumoCrescimento({ data }: { data: DecomposicaoCrescimento }) {
  const deltaQtd = data.qtd_b - data.qtd_a;
  const deltaTicket = data.ticket_b - data.ticket_a;
  const pctQtd = data.qtd_a > 0 ? (deltaQtd / data.qtd_a) : null;
  const pctTicket = data.ticket_a > 0 ? (deltaTicket / data.ticket_a) : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi
        label="Receita período A"
        valor={formatMoney(data.receita_a)}
        hint={`${formatNum(data.qtd_a)} un · ticket ${formatMoney(data.ticket_a)}`}
      />
      <Kpi
        label="Receita período B"
        valor={formatMoney(data.receita_b)}
        hint={`${formatNum(data.qtd_b)} un · ticket ${formatMoney(data.ticket_b)}`}
      />
      <Kpi
        label="Δ Receita"
        valor={formatDelta(data.total_crescimento)}
        hint={formatPct(data.pct_crescimento)}
        positivo={data.total_crescimento >= 0}
      />
      <Kpi
        label="Volume × Ticket"
        valor={`${formatPct(pctQtd)} × ${formatPct(pctTicket)}`}
        hint={`${formatNum(data.qtd_a)} → ${formatNum(data.qtd_b)} un`}
      />
    </div>
  );
}

function Kpi({
  label,
  valor,
  hint,
  positivo,
}: {
  label: string;
  valor: string;
  hint: string;
  positivo?: boolean;
}) {
  const tone =
    positivo === undefined
      ? "text-ink"
      : positivo
        ? "text-good"
        : "text-bad";
  return (
    <div className="border border-gray-line rounded-md p-3 bg-gray-soft/30">
      <div className="text-[10.5px] uppercase tracking-wide text-gray-text">{label}</div>
      <div className={`text-[18px] font-semibold mt-1 tabular ${tone}`}>{valor}</div>
      <div className="text-[11px] text-gray-text mt-0.5">{hint}</div>
    </div>
  );
}
