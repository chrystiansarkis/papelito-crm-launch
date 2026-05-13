import { useFichaCliente } from "../../hooks/useFichaCliente";
import { VendasMensaisCard } from "./VendasMensaisCard";
import { MixProdutosCard } from "./MixProdutosCard";
import { TopSkusCard } from "./TopSkusCard";
import { ProximasAcoesCard } from "./ProximasAcoesCard";
import { AtividadeRecenteCard } from "./AtividadeRecenteCard";
import { PadraoCompraCard } from "./PadraoCompraCard";
import { AlertasCard } from "./AlertasCard";

export function VisaoGeralTab({
  ficha,
}: {
  ficha: ReturnType<typeof useFichaCliente>;
}) {
  const {
    kpi,
    mixTier,
    topSkus,
    padrao,
    vendasMensais,
    timeline,
    acoes,
  } = ficha;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <VendasMensaisCard
          data={vendasMensais.data ?? []}
          isLoading={vendasMensais.isPending}
        />
      </div>
      <ProximasAcoesCard acoes={acoes} />

      <MixProdutosCard
        kpi={kpi.data ?? null}
        mixTier={mixTier.data ?? null}
        isLoading={kpi.isPending || mixTier.isPending}
      />
      <TopSkusCard data={topSkus.data ?? null} isLoading={topSkus.isPending} />
      <AlertasCard acoes={acoes} />

      <div className="lg:col-span-2">
        <PadraoCompraCard padrao={padrao.data ?? null} isLoading={padrao.isPending} />
      </div>
      <AtividadeRecenteCard
        eventos={timeline.data ?? []}
        isLoading={timeline.isPending}
      />
    </div>
  );
}