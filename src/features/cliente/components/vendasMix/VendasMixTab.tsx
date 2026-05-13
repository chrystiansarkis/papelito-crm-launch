import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaturamentoAnualCard } from "./FaturamentoAnualCard";
import { PenetracaoCard } from "./PenetracaoCard";
import { SkusPerdidosCard } from "./SkusPerdidosCard";
import {
  ExploradorMix,
  useDefaultMixFiltros,
  anosDosFiltros,
} from "./ExploradorMix/ExploradorMix";
import { useVendasMix } from "../../hooks/useVendasMix";
import { clienteKeys } from "../../hooks/queryKeys";
import { listVendasLong } from "../../api/listVendasLong";
import type { useFichaCliente } from "../../hooks/useFichaCliente";
import type { MixFiltros } from "../../types";

const ANOS_FATURAMENTO = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

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

  // Sprint 2.6e — vendasLong com range completo (7 anos) pra alimentar o
  // tooltip do FaturamentoAnualCard (breakdown por grupo pai + pico/vale).
  // Cache key separada da do ExploradorMix (anos diferentes), staleTime longo.
  const vendasLongFat = useQuery({
    queryKey: clienteKeys.vendasLong(clienteId, ANOS_FATURAMENTO),
    queryFn: () => listVendasLong(clienteId, ANOS_FATURAMENTO),
    staleTime: 5 * 60 * 1000,
    enabled: !!clienteId,
  });

  return (
    <div className="flex flex-col gap-4">
      <FaturamentoAnualCard
        kpi={ficha.kpi.data ?? null}
        vendasLong={vendasLongFat.data ?? []}
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