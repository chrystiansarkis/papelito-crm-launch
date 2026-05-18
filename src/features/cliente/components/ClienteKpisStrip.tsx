import { ProgressBar } from "@/components/common/ProgressBar";
import { formatMoney, formatMoneyShort, formatDateLong } from "@/lib/format";
import type { ClienteFicha, ClienteFichaKpi, MetaTrimestre } from "../types";

function pctDelta(current: number, prev: number): number | null {
  if (!prev) return null;
  return ((current - prev) / prev) * 100;
}

function DeltaPill({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-gray-faint">—</span>;
  const positive = pct >= 0;
  return (
    <span
      className={`text-xs font-medium ${positive ? "text-good" : "text-bad"}`}
    >
      {positive ? "+" : ""}
      {pct.toFixed(0)}% YoY
    </span>
  );
}

function Cell({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-r border-gray-line last:border-r-0 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-gray-faint">
        {label}
      </div>
      <div className="text-lg text-ink truncate">{value}</div>
      {sub && <div className="text-xs text-gray-text">{sub}</div>}
    </div>
  );
}

export function ClienteKpisStrip({
  ficha,
  kpi,
  meta,
}: {
  ficha: ClienteFicha;
  kpi: ClienteFichaKpi | null;
  meta: MetaTrimestre | null;
}) {
  const fat12 = kpi?.faturamento_12m ?? ficha.faturamento_12m;
  const fatPrev = kpi?.faturamento_ano_anterior ?? ficha.faturamento_12m_anterior;
  const yoy = kpi?.pct_crescimento ?? pctDelta(fat12, fatPrev);
  const limitePct = ficha.limite_pct_utilizado ?? 0;
  const limitVar =
    limitePct >= 90 ? "bad" : limitePct >= 70 ? "neutral" : "good";
  const metaPct = meta && meta.valor > 0 ? (ficha.faturamento_ytd / meta.valor) * 100 : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 border border-gray-line rounded-lg bg-white overflow-hidden">
      <Cell
        label="Fat. 12m"
        value={formatMoney(fat12)}
        sub={<DeltaPill pct={yoy} />}
      />
      <Cell
        label="Fat. YTD"
        value={formatMoney(ficha.faturamento_ytd)}
        sub={
          meta ? (
            <div className="space-y-1">
              <ProgressBar value={metaPct ?? 0} variant="brand" />
              <span>{metaPct != null ? `${Math.round(metaPct)}% da meta` : "—"}</span>
            </div>
          ) : (
            <span className="text-gray-faint">Sem meta</span>
          )
        }
      />
      <Cell
        label="Ticket médio"
        value={formatMoneyShort(ficha.ticket_medio_12m)}
        sub={`${ficha.qtd_pedidos_12m} pedidos`}
      />
      <Cell
        label="Última compra"
        value={formatDateLong(ficha.data_ultima_compra)}
        sub={ficha.dias_sem_compra != null ? `há ${ficha.dias_sem_compra} dias` : "—"}
      />
      <Cell
        label="Em aberto"
        value={formatMoney(ficha.total_aberto)}
        sub={
          ficha.total_vencido > 0 ? (
            <span className="text-bad">{formatMoney(ficha.total_vencido)} vencido</span>
          ) : (
            <span className="text-good">em dia</span>
          )
        }
      />
      <Cell
        label="Uso do limite"
        value={`${Math.round(limitePct)}%`}
        sub={
          <div className="space-y-1">
            <ProgressBar value={limitePct} variant={limitVar} />
            {ficha.limite_credito != null && (
              <span>{formatMoneyShort(ficha.limite_credito)}</span>
            )}
          </div>
        }
      />
    </div>
  );
}