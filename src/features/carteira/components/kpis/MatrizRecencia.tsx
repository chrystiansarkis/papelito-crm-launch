import { cn } from "@/lib/utils";
import { formatMoneyShort } from "@/lib/format";
import {
  GRUPOS_PAI,
  GRUPO_LABEL,
  formatMilhar,
  type LinhaRecencia,
} from "../../lib/carteiraKpis";
import type { CarteiraFilter, FaixaRecencia, GrupoPai } from "../../types";

const FAIXA_LABEL: Record<FaixaRecencia, string> = {
  "0-30": "0–30 dias",
  "31-60": "31–60 dias",
  "61-90": "61–90 dias",
  "91-180": "91–180 dias",
  "180+": "180+ dias",
  nunca: "Nunca compraram",
};

const FAIXA_COLOR: Record<FaixaRecencia, string> = {
  "0-30": "#22C55E",
  "31-60": "#F59E0B",
  "61-90": "#BA7517",
  "91-180": "#EF4444",
  "180+": "#5F5E5A",
  nunca: "#E8E8E3",
};

export type MatrizRecenciaProps = {
  linhas: LinhaRecencia[];
  filter: CarteiraFilter;
  onToggleFaixa: (f: FaixaRecencia) => void;
  onToggleCelula: (f: FaixaRecencia, g: GrupoPai) => void;
};

export function MatrizRecencia({
  linhas,
  filter,
  onToggleFaixa,
  onToggleCelula,
}: MatrizRecenciaProps) {
  return (
    <div className="border border-gray-line rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-medium text-ink">Última compra há</div>
        <div className="text-[11px] text-gray-faint">valor = faturamento últimos 12m</div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div
            className="grid gap-2 px-2 pb-2 text-[10.5px] uppercase tracking-wide text-gray-faint font-medium"
            style={{ gridTemplateColumns: "16px 110px 90px 110px repeat(4, 1fr)" }}
          >
            <div />
            <div>Faixa</div>
            <div>Clientes</div>
            <div>Total</div>
            {GRUPOS_PAI.map((g) => (
              <div key={g}>{GRUPO_LABEL[g]}</div>
            ))}
          </div>
          {linhas.map((l) => {
            const faixaActive =
              filter.recencia === l.faixa && filter.grupo_pai === null;
            return (
              <div
                key={l.faixa}
                className="grid gap-2 px-2 py-2 items-center text-[12.5px] border-t border-gray-line"
                style={{ gridTemplateColumns: "16px 110px 90px 110px repeat(4, 1fr)" }}
              >
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{ background: FAIXA_COLOR[l.faixa] }}
                />
                <button
                  type="button"
                  onClick={() => onToggleFaixa(l.faixa)}
                  className={cn(
                    "text-left text-ink hover:text-brand-deep transition",
                    faixaActive && "font-semibold text-brand-deep",
                  )}
                >
                  {FAIXA_LABEL[l.faixa]}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFaixa(l.faixa)}
                  className={cn(
                    "text-left tabular hover:opacity-80",
                    faixaActive && "font-semibold",
                  )}
                >
                  {formatMilhar(l.count)}{" "}
                  <span className="text-gray-faint text-[10px]">
                    {l.pct.toFixed(1).replace(".", ",")}%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFaixa(l.faixa)}
                  className={cn(
                    "text-left tabular font-mono text-[12px]",
                    faixaActive && "font-semibold",
                  )}
                >
                  {l.faixa === "nunca" ? (
                    <span className="text-gray-faint">—</span>
                  ) : (
                    formatMoneyShort(l.total12m)
                  )}
                </button>
                {GRUPOS_PAI.map((g) => {
                  const cell = l.por_grupo[g];
                  const cellActive =
                    filter.recencia === l.faixa &&
                    filter.grupo_pai === g &&
                    filter.periodo_grupo === "12m";
                  if (l.faixa === "nunca") {
                    return (
                      <div key={g} className="text-gray-faint">
                        —
                      </div>
                    );
                  }
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onToggleCelula(l.faixa, g)}
                      className={cn(
                        "text-left rounded px-1.5 py-1 transition",
                        cellActive
                          ? "bg-brand-soft ring-1 ring-brand"
                          : "hover:bg-gray-soft",
                      )}
                    >
                      <div className="font-mono text-[12px] font-medium tabular text-ink">
                        {formatMoneyShort(cell.valor)}
                      </div>
                      <div className="text-[10px] text-gray-faint">
                        {formatMilhar(cell.qtd)} cli
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}