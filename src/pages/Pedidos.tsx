// Mitigates: A10 (erros do supabase nunca chegam ao usuário; ErrorState mostra texto genérico)
//
// Fonte de dados: crm.vw_pedidos (view sobre analytics.FCT_PEDIDOS).
// Read-only: GRANT só para authenticated. Sem login real, a página fica em estado
// de erro até auth ser configurado.
import { useState } from "react";
import {
  PedidosFiltros,
  PedidosKpis,
  PedidosTabela,
  PEDIDOS_PAGE_SIZE,
  usePedidosKpis,
  usePedidosLista,
  usePedidosVendedores,
  type PedidoFiltro,
} from "@/features/pedidos";
import { PageHeader } from "@/components/common/PageHeader";
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
    <div className="p-6 space-y-6">
      <PageHeader
        title="Pedidos"
        subtitle={`${(kpisQuery.data?.total ?? 0).toLocaleString("pt-BR")} pedidos (Protheus + Salesforce)`}
      />

      <PedidosKpis kpis={kpisQuery.data} />

      <PedidosFiltros
        value={filtro}
        onChange={updateFiltro}
        vendedores={vendedoresQuery.data ?? []}
      />

      {listaQuery.isError ? (
        <ErrorState onRetry={() => listaQuery.refetch()} />
      ) : (
        <>
          <PedidosTabela rows={rows} loading={listaQuery.isPending} />
          <Pagination
            page={filtro.page}
            pageSize={PEDIDOS_PAGE_SIZE}
            total={total}
            onChange={(page) => setFiltro((p) => ({ ...p, page }))}
          />
        </>
      )}
    </div>
  );
}
