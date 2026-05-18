import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { serieDoEscopo, dayOfYear } from "../../../lib/vendasMixPivot";
import { formatMoney } from "@/lib/format";
import type { MediaTierGrupoPai, MixFiltros, MixMetrica, VendaLong } from "../../../types";

function fmt(v: number, metrica: MixMetrica): string {
  if (metrica === "pct") return `${v.toFixed(1)}%`;
  if (metrica === "qtd") return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return formatMoney(v);
}

function breadcrumbDe(rowKey: string | null): string {
  if (!rowKey || rowKey === "__total__") return "Total agregado";
  const parts = rowKey.split(">");
  const labelPai: Record<string, string> = {
    papeis: "Papéis", filtros: "Filtros", piteiras: "Piteiras", outros: "Outros",
  };
  if (parts.length === 1) return labelPai[parts[0]] ?? parts[0];
  if (parts.length === 2) return `${labelPai[parts[0]] ?? parts[0]} › ${parts[1]}`;
  return `${labelPai[parts[0]] ?? parts[0]} › ${parts[1]} › ${parts[2]}`;
}

export function GraficoContextual({
  vendas,
  filtros,
  selecionado,
  mediasTier,
}: {
  vendas: VendaLong[];
  filtros: MixFiltros;
  selecionado: string | null;
  mediasTier?: MediaTierGrupoPai[];
}) {
  const metricaPrim: MixMetrica = filtros.metricas[0] ?? "rs";
  const serie = useMemo(
    () => serieDoEscopo(vendas, filtros, selecionado, metricaPrim),
    [vendas, filtros, selecionado, metricaPrim],
  );

  const serieMedia = useMemo(() => {
    if (filtros.comparar !== "media" || !mediasTier || mediasTier.length === 0) return null;
    const paiAlvo = selecionado?.split(">")[0];
    const filtered = paiAlvo ? mediasTier.filter((m) => m.grupo_pai === paiAlvo) : mediasTier;
    const map = new Map<string, number>();
    for (const r of filtered) {
      const k = filtros.granularidade === "ano"
        ? String(r.ano)
        : filtros.granularidade === "tri"
          ? `${r.ano}-T${Math.ceil(r.mes / 3)}`
          : `${r.ano}-${String(r.mes).padStart(2, "0")}`;
      const valor = metricaPrim === "qtd" ? r.qtd_media : r.valor_medio;
      map.set(k, (map.get(k) ?? 0) + valor);
    }
    return serie.map((s) => map.get(s.key) ?? 0);
  }, [filtros, selecionado, mediasTier, metricaPrim, serie]);

  // Stats contextuais (Bloco 9): identifica QUANDO foi pico/mín.
  const positivos = serie.filter((s) => s.valor > 0);
  const picoEntry = positivos.reduce<{ label: string; valor: number } | null>(
    (best, cur) => (best == null || cur.valor > best.valor ? cur : best),
    null,
  );
  const minEntry = positivos.reduce<{ label: string; valor: number } | null>(
    (best, cur) => (best == null || cur.valor < best.valor ? cur : best),
    null,
  );
  const media = positivos.length
    ? positivos.reduce((a, b) => a + b.valor, 0) / positivos.length
    : 0;
  const periodoLabel =
    serie.length === 0
      ? ""
      : serie.length === 1
        ? serie[0].label
        : `${serie[0].label} → ${serie[serie.length - 1].label}`;

  // YoY% (último ano vs anterior, mesma janela cumulativa)
  const today = new Date();
  const monthCutoff = today.getMonth() + 1;
  const ytd2026 = vendas
    .filter((v) => v.ano === 2026 && v.mes <= monthCutoff)
    .reduce((acc, v) => acc + (metricaPrim === "qtd" ? v.qtd : v.valor), 0);
  const ytd2025Prop = vendas
    .filter((v) => v.ano === 2025 && v.mes <= monthCutoff)
    .reduce((acc, v) => acc + (metricaPrim === "qtd" ? v.qtd : v.valor), 0);
  const yoy = ytd2025Prop > 0 ? (ytd2026 / ytd2025Prop - 1) * 100 : null;
  const doy = dayOfYear(today);
  const proj2026 = doy > 0 ? (ytd2026 / doy) * 365 : 0;

  const chartData = serie.map((s, i) => ({
    label: s.label,
    valor: s.valor,
    media: serieMedia ? serieMedia[i] : null,
  }));

  return (
    <div className="border-t border-gray-line p-4">
      <div className="text-xs text-gray-text mb-2 truncate">{breadcrumbDe(selecionado)}</div>
      {serie.length === 0 ? (
        <div className="text-sm text-gray-faint">Sem dados.</div>
      ) : (
        <>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#6B6B66" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6B6B66" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => fmt(Number(v), metricaPrim)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    fmt(Number(value), metricaPrim),
                    name === "media" ? "Média tier" : "Cliente",
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 6 }}
                />
                {serieMedia && (
                  <Line
                    type="monotone"
                    dataKey="media"
                    stroke="#3B3B3B"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#FCD930"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#FCD930", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3 text-xs">
            <Stat
              label="Pico"
              value={picoEntry ? fmt(picoEntry.valor, metricaPrim) : "—"}
              caption={picoEntry?.label ?? ""}
            />
            <Stat
              label="Média"
              value={fmt(media, metricaPrim)}
              caption={periodoLabel}
            />
            <Stat
              label="Mín"
              value={minEntry ? fmt(minEntry.valor, metricaPrim) : "—"}
              caption={minEntry?.label ?? ""}
            />
            <Stat
              label="YoY"
              value={yoy == null ? "—" : `${yoy > 0 ? "+" : ""}${yoy.toFixed(0)}%`}
              valueClass={
                yoy == null
                  ? "text-gray-faint"
                  : yoy > 5
                    ? "text-emerald-700"
                    : yoy < -5
                      ? "text-red-700"
                      : "text-amber-700"
              }
            />
            <Stat label="Proj 2026" value={fmt(proj2026, metricaPrim)} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
  valueClass = "text-ink",
}: {
  label: string;
  value: string;
  caption?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-gray-faint">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${valueClass}`}>{value}</span>
      {caption ? (
        <span className="text-[10px] text-ink-soft truncate">{caption}</span>
      ) : null}
    </div>
  );
}
