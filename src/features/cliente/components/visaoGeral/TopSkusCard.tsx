import { CardWrap } from "./CardWrap";
import { formatMoneyShort } from "@/lib/format";
import type { TopSkusResult } from "../../api/listTopSkus";

function YoyCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-gray-faint text-xs">novo</span>;
  const positive = pct >= 0;
  return (
    <span className={`text-xs ${positive ? "text-good" : "text-bad"}`}>
      {positive ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
}

export function TopSkusCard({
  data,
  isLoading,
}: {
  data: TopSkusResult | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <CardWrap title="Top SKUs">
        <div className="h-32 animate-pulse bg-gray-soft rounded" />
      </CardWrap>
    );
  }
  const rows = data?.top ?? [];
  return (
    <CardWrap
      title="Top SKUs"
      subtitle="por faturamento 12m"
      meta={data ? `top 5 de ${data.total}` : undefined}
    >
      {rows.length === 0 ? (
        <div className="text-sm text-gray-faint">Sem produtos no período.</div>
      ) : (
        <ol className="divide-y divide-gray-line">
          {rows.map((r) => (
            <li
              key={r.cod_produto}
              className="py-2 flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0 flex items-start gap-2">
                <span className="text-xs text-gray-faint tabular-nums w-5 pt-0.5">
                  {r.rank_cliente}.
                </span>
                <div className="min-w-0">
                  <div className="text-ink truncate">
                    {r.nome_produto ?? r.cod_produto}
                  </div>
                  <div className="text-[10px] text-gray-faint">{r.cod_produto}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-medium tabular-nums text-ink">
                  {formatMoneyShort(r.fat_12m)}
                </div>
                <YoyCell pct={r.yoy_pct} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </CardWrap>
  );
}