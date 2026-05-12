// Mitigates: A10 (UI exibe mensagem genérica em caso de erro; sem detalhes do banco)
import { ErrorState } from "@/components/common/ErrorState";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Briefing,
  EmRiscoCard,
  FaturamentoMensalChart,
  InicioKpis,
  TopSemanaCard,
  useEmRisco,
  useFaturamentoMensal,
  useInicioKpis,
  useTopSemana,
} from "@/features/inicio";

export function Inicio() {
  const { data: user } = useCurrentUser();
  const kpisQuery = useInicioKpis();
  const mensalQuery = useFaturamentoMensal();
  const topQuery = useTopSemana();
  const riscoQuery = useEmRisco();

  const isPending =
    kpisQuery.isPending || mensalQuery.isPending || topQuery.isPending || riscoQuery.isPending;

  if (isPending) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }
  if (kpisQuery.isError || !kpisQuery.data) {
    return (
      <div className="p-8">
        <ErrorState
          onRetry={() => {
            kpisQuery.refetch();
            mensalQuery.refetch();
            topQuery.refetch();
            riscoQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <Briefing nome={user?.nome ?? ""} kpis={kpisQuery.data} />
      <InicioKpis kpis={kpisQuery.data} />
      <FaturamentoMensalChart data={mensalQuery.data ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopSemanaCard rows={topQuery.data ?? []} />
        <EmRiscoCard rows={riscoQuery.data ?? []} />
      </div>
    </div>
  );
}
