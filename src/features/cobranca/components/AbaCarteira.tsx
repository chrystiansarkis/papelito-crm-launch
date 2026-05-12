import { useState } from "react";
import { Pagination } from "@/components/common/Pagination";
import { ErrorState } from "@/components/common/ErrorState";
import {
  useCobrancaClientes,
  useCobrancaKpis,
  useCobrancaVendedores,
} from "../hooks/useCobranca";
import {
  COBRANCA_PAGE_SIZE,
  type CobrancaCarteiraFiltro,
} from "../types";
import { KpisCarteira } from "./KpisCarteira";
import { FiltrosCarteira } from "./FiltrosCarteira";
import { TabelaCarteira } from "./TabelaCarteira";

const INITIAL: CobrancaCarteiraFiltro = {
  busca: "",
  faixa: "",
  vendedor: "",
  score: "",
  comAcordo: false,
  page: 0,
};

export function AbaCarteira() {
  const [filtro, setFiltro] = useState<CobrancaCarteiraFiltro>(INITIAL);

  const kpisQuery = useCobrancaKpis();
  const vendedoresQuery = useCobrancaVendedores();
  const clientesQuery = useCobrancaClientes(filtro);

  function updateFiltro(patch: Partial<CobrancaCarteiraFiltro>) {
    setFiltro((prev) => {
      const resetsPage =
        patch.busca !== undefined ||
        patch.faixa !== undefined ||
        patch.vendedor !== undefined ||
        patch.score !== undefined ||
        patch.comAcordo !== undefined;
      return { ...prev, ...patch, ...(resetsPage ? { page: 0 } : {}) };
    });
  }

  return (
    <>
      <KpisCarteira kpis={kpisQuery.data} />

      <FiltrosCarteira
        value={filtro}
        onChange={updateFiltro}
        vendedores={vendedoresQuery.data ?? []}
      />

      {clientesQuery.isError ? (
        <ErrorState onRetry={() => clientesQuery.refetch()} />
      ) : (
        <>
          <TabelaCarteira
            rows={clientesQuery.data?.rows ?? []}
            loading={clientesQuery.isPending}
          />
          <Pagination
            page={filtro.page}
            pageSize={COBRANCA_PAGE_SIZE}
            total={clientesQuery.data?.total ?? 0}
            onChange={(page) => setFiltro((p) => ({ ...p, page }))}
          />
        </>
      )}
    </>
  );
}
