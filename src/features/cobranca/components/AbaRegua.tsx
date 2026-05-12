import { ErrorState } from "@/components/common/ErrorState";
import {
  useReguaHistorico,
  useReguaKpis,
  useReguaPassos,
  useReguaProximas,
} from "../hooks/useCobranca";
import { KpisRegua } from "./KpisRegua";
import { ReguaAtiva } from "./ReguaAtiva";
import { ProximasComunicacoes } from "./ProximasComunicacoes";
import { HistoricoComunicacoes } from "./HistoricoComunicacoes";

export type AbaReguaProps = { active: boolean };

export function AbaRegua({ active }: AbaReguaProps) {
  const kpisQuery = useReguaKpis(active);
  const passosQuery = useReguaPassos(active);
  const proximasQuery = useReguaProximas(active);
  const historicoQuery = useReguaHistorico(active);

  const isPending =
    kpisQuery.isPending ||
    passosQuery.isPending ||
    proximasQuery.isPending ||
    historicoQuery.isPending;

  const isError =
    kpisQuery.isError ||
    passosQuery.isError ||
    proximasQuery.isError ||
    historicoQuery.isError;

  if (isPending) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }
  if (isError) {
    return (
      <ErrorState
        onRetry={() => {
          kpisQuery.refetch();
          passosQuery.refetch();
          proximasQuery.refetch();
          historicoQuery.refetch();
        }}
      />
    );
  }

  return (
    <>
      <KpisRegua kpis={kpisQuery.data} />
      <ReguaAtiva passos={passosQuery.data ?? []} />
      <ProximasComunicacoes proximas={proximasQuery.data ?? []} />
      <HistoricoComunicacoes historico={historicoQuery.data ?? []} />
    </>
  );
}
