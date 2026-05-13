import { useState } from "react";
import { FaturamentoAnualCard } from "./FaturamentoAnualCard";
import { PenetracaoCard } from "./PenetracaoCard";
import { SkusPerdidosCard } from "./SkusPerdidosCard";
import {
  ExploradorMix,
  useDefaultMixFiltros,
  anosDosFiltros,
} from "./ExploradorMix/ExploradorMix";
import { useVendasMix } from "../../hooks/useVendasMix";
import type { useFichaCliente } from "../../hooks/useFichaCliente";
import type { MixFiltros } from "../../types";

export function VendasMixTab({
  clienteId,
  ficha,
}: {
  clienteId: string;
  ficha: ReturnType<typeof useFichaCliente>;
}) {
  const defaultFiltros = useDefaultMixFiltros();
  const [filtros, setFiltros] = useState<MixFiltros>(defaultFiltros);
  const anos = anosDosFiltros(filtros);
  const tier = ficha.ficha.data?.tier ?? null;
  const mix = useVendasMix(clienteId, anos, tier);

  return (
    <div className="flex flex-col gap-4">
      <FaturamentoAnualCard
        kpi={ficha.kpi.data ?? null}
        vendasMensais={ficha.vendasMensais.data ?? []}
        isLoading={ficha.kpi.isPending}
      />
      <ExploradorMix
        clienteId={clienteId}
        vendas={mix.vendasLong.data ?? []}
        isLoading={mix.vendasLong.isPending}
        filtros={filtros}
        onChangeFiltros={setFiltros}
        mediasTier={mix.mediaTier.data ?? []}
        tier={tier}
      />
      <PenetracaoCard
        vendas={mix.vendasLong.data ?? []}
        penetracao={mix.penetracao.data ?? null}
        isLoading={mix.penetracao.isPending}
      />
      <SkusPerdidosCard skus={mix.skusPerdidos.data ?? []} isLoading={mix.skusPerdidos.isPending} />
    </div>
  );
}