// Mitigates: A05 (params para a RPC sao strings yyyy-mm-dd tipadas),
//            A10 (erros propagam para react-query e mostramos ErrorState)
//
// Aba "Crescimento" da ficha do cliente. Mostra a decomposicao do crescimento
// de receita (Volume vs Preco/Mix) entre dois periodos selecionaveis.
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { useCrescimentoDecomp } from "../../hooks/useCrescimentoDecomp";
import {
  computeDefaultPeriodos,
  PeriodoSelector,
  type PeriodoSelectorValue,
} from "./PeriodoSelector";
import { KpiResumoCrescimento } from "./KpiResumoCrescimento";
import { DecomposicaoCard } from "./DecomposicaoCard";

export function CrescimentoTab({ clienteId }: { clienteId: string }) {
  const [periodos, setPeriodos] = useState<PeriodoSelectorValue>(() => ({
    modo: "12m_vs_12m",
    ...computeDefaultPeriodos("12m_vs_12m"),
  }));

  const query = useCrescimentoDecomp(clienteId, periodos.periodoA, periodos.periodoB);

  const semDadosA = query.data ? query.data.receita_a === 0 : false;
  const semDadosB = query.data ? query.data.receita_b === 0 : false;
  const semQualquer = useMemo(() => semDadosA && semDadosB, [semDadosA, semDadosB]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-line rounded-lg p-3">
        <PeriodoSelector value={periodos} onChange={setPeriodos} />
        <p className="text-[11px] text-gray-text mt-2">
          A → B compara o período "anterior" com o "atual". Considera apenas operações de venda (exclui devoluções e bonificações).
        </p>
      </div>

      {query.isPending && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-20 animate-pulse bg-gray-soft rounded" />
          <div className="h-20 animate-pulse bg-gray-soft rounded" />
          <div className="h-20 animate-pulse bg-gray-soft rounded" />
          <div className="h-20 animate-pulse bg-gray-soft rounded" />
        </div>
      )}
      {query.isError && <ErrorState onRetry={() => query.refetch()} />}

      {query.data && !query.isError && (
        <>
          <KpiResumoCrescimento data={query.data} />
          {semQualquer ? (
            <div className="bg-white border border-gray-line rounded-lg p-6 text-center text-sm text-gray-text">
              Cliente sem vendas nos períodos selecionados.
            </div>
          ) : (
            <DecomposicaoCard data={query.data} />
          )}
        </>
      )}
    </div>
  );
}
