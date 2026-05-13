import { CardWrap } from "./CardWrap";
import { formatMoneyShort } from "@/lib/format";
import type { VendaMensal } from "../../types";

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function parseMes(iso: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1 };
}

export function VendasMensaisCard({
  data,
  isLoading,
}: {
  data: VendaMensal[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <CardWrap title="Vendas mensais" subtitle="últimos 24 meses">
        <div className="h-40 animate-pulse bg-gray-soft rounded" />
      </CardWrap>
    );
  }
  const max = Math.max(1, ...data.map((d) => d.valor));
  const total = data.reduce((s, d) => s + d.valor, 0);
  return (
    <CardWrap
      title="Vendas mensais"
      subtitle="últimos 24 meses"
      meta={formatMoneyShort(total)}
    >
      {data.length === 0 ? (
        <div className="text-sm text-gray-faint">Sem vendas no período.</div>
      ) : (
        <div className="flex items-end gap-1 h-40">
          {data.map((d) => {
            const parsed = parseMes(d.mes);
            const pct = Math.max((d.valor / max) * 100, d.valor > 0 ? 4 : 1);
            return (
              <div
                key={d.mes}
                className="flex-1 flex flex-col items-center gap-1 group min-w-0"
                title={`${parsed ? `${MESES[parsed.m]}/${String(parsed.y).slice(2)}` : d.mes} · ${formatMoneyShort(d.valor)}`}
              >
                <div
                  className="w-full bg-brand/70 group-hover:bg-brand rounded-sm transition-colors"
                  style={{ height: `${pct}%` }}
                />
              </div>
            );
          })}
        </div>
      )}
      {data.length > 0 && (
        <div className="flex justify-between text-[10px] text-gray-faint mt-1">
          <span>
            {(() => {
              const p = parseMes(data[0].mes);
              return p ? `${MESES[p.m]}/${String(p.y).slice(2)}` : "";
            })()}
          </span>
          <span>
            {(() => {
              const p = parseMes(data[data.length - 1].mes);
              return p ? `${MESES[p.m]}/${String(p.y).slice(2)}` : "";
            })()}
          </span>
        </div>
      )}
    </CardWrap>
  );
}