import { useMemo } from "react";
import { serieDoEscopo, dayOfYear } from "../../../lib/vendasMixPivot";
import type { MediaTierGrupoPai, MixFiltros, MixMetrica, VendaLong } from "../../../types";

function fmt(v: number, metrica: MixMetrica): string {
  if (metrica === "pct") return `${v.toFixed(1)}%`;
  if (metrica === "qtd") return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
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

  // Série média (só quando comparar=media e há dado de tier)
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

  const valores = serie.map((s) => s.valor);
  const max = Math.max(1, ...valores, ...(serieMedia ?? []));
  const positivos = valores.filter((v) => v > 0);
  const pico = positivos.length ? Math.max(...positivos) : 0;
  const min = positivos.length ? Math.min(...positivos) : 0;
  const media = positivos.length ? positivos.reduce((a, b) => a + b, 0) / positivos.length : 0;

  // YoY% (último ano vs anterior, mesma janela cumulativa)
  const ytd2025 = vendas.filter((v) => v.ano === 2025).reduce((acc, v) => acc + (metricaPrim === "qtd" ? v.qtd : v.valor), 0);
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

  // SVG sparkline polyline
  const W = 600, H = 96;
  function pathFor(arr: number[]): string {
    if (arr.length === 0) return "";
    const stepX = arr.length === 1 ? W : W / (arr.length - 1);
    return arr
      .map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${(H - (v / max) * H).toFixed(1)}`)
      .join(" ");
  }

  return (
    <div className="border-t border-gray-line p-4">
      <div className="text-xs text-gray-text mb-2 truncate">{breadcrumbDe(selecionado)}</div>
      {serie.length === 0 ? (
        <div className="text-sm text-gray-faint">Sem dados.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
            {serieMedia && (
              <path d={pathFor(serieMedia)} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.2" strokeDasharray="3 3" />
            )}
            <path d={pathFor(serie.map((s) => s.valor))} fill="none" stroke="#d97706" strokeWidth="1.8" />
            {serie.map((s, i) => {
              const stepX = serie.length === 1 ? W : W / (serie.length - 1);
              const x = i * stepX;
              const y = H - (s.valor / max) * H;
              return <circle key={s.key} cx={x} cy={y} r={2.5} fill="#d97706" />;
            })}
          </svg>
          <div className="flex justify-between text-[9px] text-gray-faint mt-1">
            {serie.map((s) => <span key={s.key} className="truncate flex-1 text-center">{s.label}</span>)}
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3 text-xs">
            <div><span className="text-gray-faint">Pico:</span> <span className="text-ink tabular-nums">{fmt(pico, metricaPrim)}</span></div>
            <div><span className="text-gray-faint">Média:</span> <span className="text-ink tabular-nums">{fmt(media, metricaPrim)}</span></div>
            <div><span className="text-gray-faint">Mín:</span> <span className="text-ink tabular-nums">{fmt(min, metricaPrim)}</span></div>
            <div>
              <span className="text-gray-faint">YoY:</span>{" "}
              <span className={`tabular-nums ${yoy == null ? "text-gray-faint" : yoy > 5 ? "text-emerald-700" : yoy < -5 ? "text-red-700" : "text-amber-700"}`}>
                {yoy == null ? "—" : `${yoy > 0 ? "+" : ""}${yoy.toFixed(0)}%`}
              </span>
            </div>
            <div><span className="text-gray-faint">Proj. 2026:</span> <span className="text-ink tabular-nums">{fmt(proj2026, metricaPrim)}</span></div>
          </div>
          {void ytd2025}
        </>
      )}
    </div>
  );
}
