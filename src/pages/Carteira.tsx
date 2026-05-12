// Mitigates: A10 (erros do supabase nunca chegam ao usuário; ErrorState mostra texto genérico)
import { useState } from "react";
import {
  CarteiraFiltros,
  CarteiraKpis,
  CarteiraTable,
  useCarteiraClientes,
  useCarteiraKpis,
  useCarteiraVendedores,
  CARTEIRA_PAGE_SIZE,
  type CarteiraFiltro,
} from "@/features/carteira";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { ErrorState } from "@/components/common/ErrorState";

const INITIAL_FILTRO: CarteiraFiltro = {
  busca: "",
  saude: "",
  vendedor: "",
  programa: "",
  page: 0,
};

export default function Carteira() {
  const [filtro, setFiltro] = useState<CarteiraFiltro>(INITIAL_FILTRO);

  const kpisQuery = useCarteiraKpis();
  const vendedoresQuery = useCarteiraVendedores();
  const clientesQuery = useCarteiraClientes(filtro);

  function updateFiltro(patch: Partial<CarteiraFiltro>) {
    setFiltro((prev) => {
      const resetsPage = patch.busca !== undefined || patch.saude !== undefined
        || patch.vendedor !== undefined || patch.programa !== undefined;
      return { ...prev, ...patch, ...(resetsPage ? { page: 0 } : {}) };
    });
  }

  const total = clientesQuery.data?.total ?? 0;
  const rows = clientesQuery.data?.rows ?? [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Carteira"
        subtitle={`${(kpisQuery.data?.total ?? 0).toLocaleString("pt-BR")} clientes`}
      />

      <CarteiraKpis kpis={kpisQuery.data} />

      <CarteiraFiltros
        value={filtro}
        onChange={updateFiltro}
        vendedores={vendedoresQuery.data ?? []}
      />

      {clientesQuery.isError ? (
        <ErrorState onRetry={() => clientesQuery.refetch()} />
      ) : (
        <>
          <CarteiraTable rows={rows} loading={clientesQuery.isPending} />
          <Pagination
            page={filtro.page}
            pageSize={CARTEIRA_PAGE_SIZE}
            total={total}
            onChange={(page) => setFiltro((p) => ({ ...p, page }))}
          />
        </>
      )}
    </div>
  );
}
