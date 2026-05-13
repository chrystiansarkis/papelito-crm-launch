import { useMemo } from "react";
import { serieDoEscopo } from "../../../lib/vendasMixPivot";
import type { MixFiltros, VendaLong } from "../../../types";

function fmt(v: number, metrica: MixFiltros["metrica"]): string {
  if (metrica === "pct") return `${v.toFixed(1)}%`;
  if (metrica === "qtd") return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

export function GraficoContextual({
  vendas,
  filtros,
  selecionado,
}: {
  vendas: VendaLong[];
  filtros: MixFiltros;
  selecionado: string | null;
}) {
  const serie = useMemo(() => serieDoEscopo(vendas, filtros, selecionado), [vendas, filtros, selecionado]);
  const max = Math.max(1, ...serie.map((s) => s.valor));
  const valores = serie.map((s) => s.valor).filter((v) => v > 0);
  const pico = valores.length ? Math.max(...valores) : 0;
  const min = valores.length ? Math.min(...valores) : 0;
  const media = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;

  const breadcrumb = (() => {
    if (!selecionado || selecionado === "__total__") return "Total agregado";
    const parts = selecionado.split(">");
    return parts.join(" › ");
  })();

  return (
    <div className="border-t border-gray-line p-4">
      <div className="text-xs text-gray-text mb-2">{breadcrumb}</div>
      {serie.length === 0 ? (
        <div className="text-sm text-gray-faint">Sem dados.</div>
      ) : (
        <>
          <div className="flex items-end gap-1 h-24">
            {serie.map((s) => (
              <div key={s.key} className="flex-1 flex flex-col items-center min-w-0" title={fmt(s.valor, filtros.metrica)}>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full bg-amber-500 rounded-t"
                    style={{ height: `${(s.valor / max) * 100}%` }}
                  />
                </div>
                <div className="text-[9px] text-gray-faint mt-1 truncate w-full text-center">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div><span className="text-gray-faint">Pico:</span> <span className="text-ink tabular-nums">{fmt(pico, filtros.metrica)}</span></div>
            <div><span className="text-gray-faint">Média:</span> <span className="text-ink tabular-nums">{fmt(media, filtros.metrica)}</span></div>
            <div><span className="text-gray-faint">Mínimo:</span> <span className="text-ink tabular-nums">{fmt(min, filtros.metrica)}</span></div>
          </div>
        </>
      )}
    </div>
  );
}