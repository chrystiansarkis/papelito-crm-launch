import { CardWrap } from "../visaoGeral/CardWrap";
import { formatDateLong, formatMoneyShort } from "@/lib/format";
import type { SkuPerdido } from "../../types";

export function SkusPerdidosCard({
  skus,
  isLoading,
}: {
  skus: SkuPerdido[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <CardWrap title="Parou de comprar">
        <div className="h-32 animate-pulse bg-gray-soft rounded" />
      </CardWrap>
    );
  }

  return (
    <section className="border border-red-200 rounded-lg" style={{ background: "#FCEBEB" }}>
      <header className="px-4 py-3 border-b border-red-200">
        <h2 className="text-sm font-medium text-ink">
          Parou de comprar <span className="text-xs text-gray-text">· SKUs sem pedido há 60+ dias</span>
        </h2>
      </header>
      <div className="p-4">
        {skus.length === 0 ? (
          <div className="text-sm text-gray-faint">Nenhum SKU relevante parado.</div>
        ) : (
          <ul className="divide-y divide-red-200/60">
            {skus.map((s) => (
              <li key={s.cod_produto} className="py-2 flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="text-red-900 font-medium truncate">
                    {s.nome_produto || s.cod_produto}
                  </div>
                  <div className="text-xs text-gray-text">
                    última compra: {formatDateLong(s.ultima_compra)} · {s.dias_sem_compra} dias
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums text-red-700 font-medium">
                  −{formatMoneyShort(s.valor_medio_mensal)}/mês
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}