import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { SITUACAO_PROMESSA } from "@/lib/badges";
import { useAcordos, usePromessas } from "../hooks/useCobranca";
import { AcordoCard } from "./AcordoCard";
import { TabelaPromessas } from "./TabelaPromessas";
import type { FiltroSituacaoPromessa } from "../types";

export type AbaAcordosProps = { active: boolean };

export function AbaAcordos({ active }: AbaAcordosProps) {
  const navigate = useNavigate();
  const acordosQuery = useAcordos(active);
  const promessasQuery = usePromessas(active);
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacaoPromessa>("");

  const acordos = acordosQuery.data ?? [];
  const promessas = promessasQuery.data ?? [];

  const acordosAtivos = useMemo(
    () => acordos.filter((a) => a.status === "ativo").length,
    [acordos]
  );
  const promessasPendentes = useMemo(
    () =>
      promessas.filter((p) => ["futura", "proxima", "hoje", "atrasada"].includes(p.situacao))
        .length,
    [promessas]
  );
  const promessasFiltradas = useMemo(() => {
    return promessas
      .filter((p) => {
        if (filtroSituacao === "") return true;
        if (filtroSituacao === "pendentes")
          return ["futura", "proxima", "hoje", "atrasada"].includes(p.situacao);
        return p.situacao === filtroSituacao;
      })
      .sort((a, b) => {
        const oa = SITUACAO_PROMESSA[a.situacao]?.ordem ?? 99;
        const ob = SITUACAO_PROMESSA[b.situacao]?.ordem ?? 99;
        if (oa !== ob) return oa - ob;
        return (a.data_prometida ?? "").localeCompare(b.data_prometida ?? "");
      });
  }, [promessas, filtroSituacao]);

  if (acordosQuery.isPending || promessasQuery.isPending) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }
  if (acordosQuery.isError || promessasQuery.isError) {
    return (
      <ErrorState
        onRetry={() => {
          acordosQuery.refetch();
          promessasQuery.refetch();
        }}
      />
    );
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl">Acordos de parcelamento</h2>
          <span className="text-sm text-muted-foreground">
            ({acordosAtivos} ativo{acordosAtivos === 1 ? "" : "s"})
          </span>
        </div>

        {acordos.length === 0 ? (
          <EmptyState icon="📋" message="Nenhum acordo de parcelamento registrado ainda." />
        ) : (
          <div className="space-y-3">
            {acordos.map((a) => (
              <AcordoCard
                key={a.id}
                acordo={a}
                onClickCliente={() => navigate(`/cliente/${a.cliente_id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl">Promessas de pagamento</h2>
            <span className="text-sm text-muted-foreground">
              ({promessasPendentes} pendente{promessasPendentes === 1 ? "" : "s"})
            </span>
          </div>
          <select
            value={filtroSituacao}
            onChange={(e) => setFiltroSituacao(e.target.value as FiltroSituacaoPromessa)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
          >
            <option value="">Todas situações</option>
            <option value="pendentes">Pendentes</option>
            <option value="cumprida">Cumpridas</option>
            <option value="quebrada">Quebradas</option>
          </select>
        </div>

        <TabelaPromessas rows={promessasFiltradas} />
      </section>
    </>
  );
}
