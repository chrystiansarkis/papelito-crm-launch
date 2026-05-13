// Itens do pedido (linhas de FCT_PEDIDOS via vw_pedido_itens). Read-only.
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { LoadingRow, EmptyRow } from "@/components/common/LoadingRow";
import type { PedidoItem } from "../types";

export function PedidoItensTabela({
  itens,
  loading,
}: {
  itens: PedidoItem[];
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-gray-line rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-soft">
          <tr>
            <Th className="w-12 text-center">#</Th>
            <Th className="min-w-[180px]">Grupo</Th>
            <Th className="min-w-[260px]">Produto</Th>
            <Th className="text-right">Qtd</Th>
            <Th className="text-right">Vlr unit.</Th>
            <Th className="text-right">Bruto</Th>
            <Th className="text-right">Desc.</Th>
            <Th className="text-right">Líquido</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={8} />}
          {!loading && itens.length === 0 && (
            <EmptyRow colSpan={8} message="Pedido sem itens registrados" />
          )}
          {!loading &&
            itens.map((it) => (
              <tr key={it.id} className="border-b border-gray-line hover:bg-gray-soft/50">
                <td className="px-3 py-2 text-center text-[12px] tabular text-gray-text">
                  {it.sequencia ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {it.grupo_nome ? (
                    <div className="flex flex-col" title={it.cod_grupo_prod ?? undefined}>
                      <span className="text-[12.5px] text-ink">{it.grupo_nome}</span>
                      {it.cod_grupo_prod && (
                        <span className="text-[10.5px] font-mono text-gray-faint">
                          {it.cod_grupo_prod}
                        </span>
                      )}
                    </div>
                  ) : it.cod_grupo_prod ? (
                    <span className="text-[12.5px] font-mono text-gray-text">
                      {it.cod_grupo_prod}
                    </span>
                  ) : (
                    <span className="text-gray-faint">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {it.produto_nome ? (
                    <div className="flex flex-col" title={it.cod_prod_origem ?? it.cod_produto ?? undefined}>
                      <span className="text-[12.5px] text-ink">{it.produto_nome}</span>
                      <span className="text-[10.5px] text-gray-faint">
                        {it.cod_prod_origem && (
                          <span className="font-mono">{it.cod_prod_origem}</span>
                        )}
                        {it.cod_prod_origem && it.produto_unidade && " · "}
                        {it.produto_unidade && (
                          <span className="uppercase">{it.produto_unidade}</span>
                        )}
                      </span>
                    </div>
                  ) : it.cod_prod_origem ? (
                    <div
                      className="flex flex-col"
                      title="Produto sem mapeamento em meta.MAP_PRODUTOS"
                    >
                      <span className="text-[12.5px] font-mono text-ink">
                        {it.cod_prod_origem}
                      </span>
                      <span className="text-[10.5px] text-warn">sem cadastro na dimensão</span>
                    </div>
                  ) : (
                    <span className="text-gray-faint">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-[12.5px] tabular text-ink">
                  {it.qtd.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-right text-[12.5px] tabular text-ink">
                  {formatMoney(it.vlr_unit)}
                </td>
                <td className="px-3 py-2 text-right text-[12.5px] tabular text-gray-text">
                  {formatMoney(it.vlr_bruto)}
                </td>
                <td className="px-3 py-2 text-right text-[12.5px] tabular text-gray-text">
                  {it.vlr_desc > 0 ? `- ${formatMoney(it.vlr_desc)}` : "—"}
                </td>
                <td className="px-3 py-2 text-right text-[12.5px] tabular text-ink font-medium whitespace-nowrap">
                  {formatMoney(it.vlr_liq)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-3 py-2.5 text-left label-caps text-gray-text", className)}>
      {children}
    </th>
  );
}
