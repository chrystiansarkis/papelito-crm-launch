import { CardWrap } from "./CardWrap";
import { Pill } from "@/components/common/Pill";
import { formatMoneyShort } from "@/lib/format";
import type { ClienteFichaKpi, MixTierRow } from "../../types";

const GRUPOS = [
  { key: "papeis", label: "Papéis", color: "bg-amber-500" },
  { key: "filtros", label: "Filtros", color: "bg-blue-500" },
  { key: "piteiras", label: "Piteiras", color: "bg-purple-500" },
  { key: "outros", label: "Outros", color: "bg-gray-400" },
] as const;

function pct(val: number, total: number): number {
  return total > 0 ? (val / total) * 100 : 0;
}

export function MixProdutosCard({
  kpi,
  mixTier,
  isLoading,
}: {
  kpi: ClienteFichaKpi | null;
  mixTier: MixTierRow | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <CardWrap title="Mix de produtos">
        <div className="h-32 animate-pulse bg-gray-soft rounded" />
      </CardWrap>
    );
  }
  if (!kpi) {
    return (
      <CardWrap title="Mix de produtos">
        <div className="text-sm text-gray-faint">Sem dados.</div>
      </CardWrap>
    );
  }

  const totals = {
    papeis: kpi.fat_12m_papeis ?? 0,
    filtros: kpi.fat_12m_filtros ?? 0,
    piteiras: kpi.fat_12m_piteiras ?? 0,
    outros: kpi.fat_12m_outros ?? 0,
  };
  const total = totals.papeis + totals.filtros + totals.piteiras + totals.outros;

  const usandoTier = !!kpi.tier && !!mixTier;
  const refLabel = usandoTier ? `vs média Tier ${kpi.tier!.toUpperCase()}` : "vs média geral";

  const tierPct = mixTier
    ? {
        papeis: mixTier.pct_papeis,
        filtros: mixTier.pct_filtros,
        piteiras: mixTier.pct_piteiras,
        outros: mixTier.pct_outros,
      }
    : null;

  return (
    <CardWrap
      title="Mix de produtos"
      meta={formatMoneyShort(total)}
      subtitle={refLabel}
      badge={
        usandoTier ? (
          <Pill variant="soft">Tier {kpi.tier!.toUpperCase()}</Pill>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {GRUPOS.map((g) => {
          const v = totals[g.key];
          const p = pct(v, total);
          const ref = tierPct ? tierPct[g.key] : null;
          const delta = ref != null ? p - ref : null;
          return (
            <div key={g.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-ink">
                  <span className={`w-2 h-2 rounded-sm ${g.color}`} />
                  <span>{g.label}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-ink font-medium">{p.toFixed(1)}%</span>
                  {delta != null && (
                    <span
                      className={`text-[10px] ${
                        Math.abs(delta) < 2
                          ? "text-gray-faint"
                          : delta > 0
                            ? "text-good"
                            : "text-bad"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}pp
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-2 bg-gray-soft rounded-full overflow-hidden">
                <div
                  className={`h-full ${g.color} rounded-full`}
                  style={{ width: `${Math.min(p, 100)}%` }}
                />
                {ref != null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-ink/40"
                    style={{ left: `${Math.min(ref, 100)}%` }}
                    title={`Média ${refLabel.replace("vs média ", "")}: ${ref.toFixed(1)}%`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </CardWrap>
  );
}