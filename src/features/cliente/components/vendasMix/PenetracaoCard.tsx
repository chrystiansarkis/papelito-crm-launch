import { CardWrap } from "../visaoGeral/CardWrap";
import type { PenetracaoCarteira, VendaLong } from "../../types";

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function PenetracaoCard({
  vendas,
  penetracao,
  isLoading,
}: {
  vendas: VendaLong[];
  penetracao: PenetracaoCarteira | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <CardWrap title="Penetração de catálogo">
        <div className="h-24 animate-pulse bg-gray-soft rounded" />
      </CardWrap>
    );
  }

  const skusComprados = new Set(vendas.map((v) => v.cod_produto)).size;
  const totalAtivos = penetracao?.total_skus_ativos ?? 0;
  const avgClientes = penetracao?.avg_skus_por_cliente ?? 0;

  const penetracaoPct = totalAtivos > 0 ? (skusComprados / totalAtivos) * 100 : 0;
  const mediaPct = totalAtivos > 0 ? (avgClientes / totalAtivos) * 100 : 0;
  const gap = Math.max(0, Math.round(avgClientes - skusComprados));

  return (
    <CardWrap title="Penetração de catálogo" subtitle="quanto do portfólio o cliente compra">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-2xl font-medium text-ink tabular-nums">{skusComprados}</div>
          <div className="text-xs text-gray-text">SKUs comprados · de {totalAtivos} ativos</div>
        </div>
        <div>
          <div className="text-2xl font-medium text-amber-600 tabular-nums">{formatPct(penetracaoPct)}</div>
          <div className="text-xs text-gray-text">Penetração · média {formatPct(mediaPct)}</div>
        </div>
        <div>
          <div className={`text-2xl font-medium tabular-nums ${gap > 0 ? "text-good" : "text-gray-faint"}`}>
            {gap > 0 ? `+${gap}` : "0"}
          </div>
          <div className="text-xs text-gray-text">SKUs a recomendar</div>
        </div>
      </div>
      <div className="relative h-3 bg-gray-soft rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full"
          style={{ width: `${Math.min(penetracaoPct, 100)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-ink/50"
          style={{ left: `${Math.min(mediaPct, 100)}%` }}
          title={`Média da carteira: ${formatPct(mediaPct)}`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-faint mt-1">
        <span>você {formatPct(penetracaoPct)}</span>
        <span>média {formatPct(mediaPct)}</span>
      </div>
    </CardWrap>
  );
}