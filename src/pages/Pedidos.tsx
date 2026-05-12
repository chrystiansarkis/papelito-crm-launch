// Mitigates: A10 (erros do supabase nunca chegam ao usuário; ErrorState mostra texto genérico)
//
// Fonte de dados: crm.vw_pedidos (view sobre analytics.FCT_PEDIDOS).
// Read-only: GRANT só para authenticated. Sem login real, a página fica em estado
// de erro até auth ser configurado.
import { useState } from "react";
import {
  PedidosFiltros,
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

const INITIAL_FILTRO: PedidoFiltro = {
  busca: "",
  status: "",
  fonte: "",
  vendedor: "",
  page: 0,
};

export default function Pedidos() {
  const [filtro, setFiltro] = useState<PedidoFiltro>(INITIAL_FILTRO);

  const kpisQuery = usePedidosKpis();
  const vendedoresQuery = usePedidosVendedores();
  const listaQuery = usePedidosLista(filtro);

  function updateFiltro(patch: Partial<PedidoFiltro>) {
    setFiltro((prev) => {
      const resetsPage =
        patch.busca !== undefined ||
        patch.status !== undefined ||
        patch.fonte !== undefined ||
        patch.vendedor !== undefined;
      return { ...prev, ...patch, ...(resetsPage ? { page: 0 } : {}) };
    });
  }

  const total = listaQuery.data?.total ?? 0;
  const rows = listaQuery.data?.rows ?? [];

  return (
    <div className="flex flex-col min-h-full">
      <GlobalBar
        metrics={{
          count: kpisQuery.data?.total ?? total,
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
              Pedidos consolidados de Protheus e Salesforce — filtre por status, fonte ou vendedor
            </p>
          </div>
        </div>

        <PedidosFiltros
          value={filtro}
          onChange={updateFiltro}
          vendedores={vendedoresQuery.data ?? []}
        />

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
                page={filtro.page}
                pageSize={PEDIDOS_PAGE_SIZE}
                total={total}
                onChange={(page) => setFiltro((p) => ({ ...p, page }))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
