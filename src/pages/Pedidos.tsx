// Mitigates: A10 (erros do supabase nunca chegam ao usuário; ErrorState mostra texto genérico)
//
// Fonte de dados: public.vw_pedidos_lista (UNION ALL de vw_pedidos_enriched
// + crm.orcamentos). Pedidos ERP (PROTHEUS) e orcamentos (SALESFORCE / CRM)
// aparecem na mesma lista; a coluna "Fonte" diferencia.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  PedidosTabela,
  PEDIDOS_PAGE_SIZE,
  usePedidosKpis,
  usePedidosLista,
  usePedidosVendedores,
  type PedidoFiltro,
} from "@/features/pedidos";
import { GlobalBar } from "@/features/carteira";
import { Pagination } from "@/components/common/Pagination";
import { ErrorState } from "@/components/common/ErrorState";
import { useGlobalFilters } from "@/features/shared/globalFilters";

export default function Pedidos() {
  const { filters: gf, setFilter } = useGlobalFilters();
  const [page, setPage] = useState(0);

  // Reset page sempre que qualquer filtro global muda
  useEffect(() => {
    setPage(0);
  }, [
    gf.busca,
    gf.status,
    gf.fonte,
    gf.vendedor,
    gf.uf,
    gf.tipo,
    gf.saude,
    gf.programa,
    gf.score,
    gf.tier,
    gf.periodo,
  ]);

  const filtro: PedidoFiltro = useMemo(
    () => ({
      busca: gf.busca,
      status: gf.status,
      fonte: gf.fonte,
      vendedor: gf.vendedor,
      uf: gf.uf,
      tipo: gf.tipo,
      saude: gf.saude,
      programa: gf.programa,
      score: gf.score,
      tier: gf.tier,
      periodo: gf.periodo,
      page,
    }),
    [gf, page],
  );

  const kpisQuery = usePedidosKpis(filtro);
  const vendedoresQuery = usePedidosVendedores();
  const listaQuery = usePedidosLista(filtro);

  const total = listaQuery.data?.total ?? 0;
  const rows = listaQuery.data?.rows ?? [];

  return (
    <div className="flex flex-col min-h-full">
      <GlobalBar
        scope="pedidos"
        vendedores={vendedoresQuery.data ?? []}
        metrics={{
          count: total,
          countLabel: "pedidos",
          ytd: kpisQuery.data?.valor_total ?? null,
          avgTicket: null,
        }}
      />

      <div className="p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">Pedidos</h1>
            <p className="text-[13px] text-gray-text">
              Pedidos e orcamentos consolidados — use os filtros globais para recortar
            </p>
          </div>
          <Link
            to="/pedidos/novo"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Novo orcamento
          </Link>
        </div>

        {/* Busca local */}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={gf.busca}
            onChange={(e) => setFilter("busca", e.target.value)}
            placeholder="Buscar por nº ou cliente..."
            className="px-3 py-2 text-[12.5px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition-colors flex-1 min-w-[240px]"
          />
        </div>

        {listaQuery.isError ? (
          <ErrorState onRetry={() => listaQuery.refetch()} />
        ) : (
          <div>
            <PedidosTabela rows={rows} loading={listaQuery.isPending} />
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] text-gray-text">
                {(vendedoresQuery.data?.length ?? 0)} vendedor(es) com pedidos ·{" "}
                {total.toLocaleString("pt-BR")} pedido(s) no total
              </div>
            </div>
            <div className="mt-4">
              <Pagination
                page={page}
                pageSize={PEDIDOS_PAGE_SIZE}
                total={total}
                onChange={setPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
