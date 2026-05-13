import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clienteKeys } from "./queryKeys";
import { listVendasLong } from "../api/listVendasLong";
import { listSkusPerdidos } from "../api/listSkusPerdidos";
import { getPenetracaoMedia } from "../api/getPenetracaoMedia";
import { listObservacoesProduto } from "../api/listObservacoesProduto";
import { getMediaTierGrupoPai } from "../api/getMediaTierGrupoPai";
import {
  criarObservacaoProduto,
  type CriarObservacaoInput,
} from "../api/criarObservacaoProduto";
import type { ObsProdutoScope } from "../types";

const STALE = 5 * 60 * 1000;
const STALE_REF = 30 * 60 * 1000;

export function useVendasMix(
  clienteId: string | undefined,
  anos: number[],
  tier: string | null = null,
) {
  const enabled = !!clienteId;
  const safe = clienteId ?? "";

  const vendasLong = useQuery({
    queryKey: enabled ? clienteKeys.vendasLong(safe, anos) : ["cliente", "vl", "none"],
    queryFn: () => listVendasLong(safe, anos.length > 0 ? anos : undefined),
    enabled,
    staleTime: STALE,
  });

  const skusPerdidos = useQuery({
    queryKey: enabled ? clienteKeys.skusPerdidos(safe) : ["cliente", "sp", "none"],
    queryFn: () => listSkusPerdidos(safe),
    enabled,
    staleTime: STALE,
  });

  const penetracao = useQuery({
    queryKey: clienteKeys.penetracao(),
    queryFn: () => getPenetracaoMedia(),
    staleTime: STALE_REF,
  });

  const mediaTier = useQuery({
    queryKey: clienteKeys.mediaTierGrupoPai(tier, anos),
    queryFn: () => getMediaTierGrupoPai(tier, anos),
    staleTime: STALE_REF,
  });

  return { vendasLong, skusPerdidos, penetracao, mediaTier };
}

export function useObservacoesProduto(
  clienteId: string | undefined,
  scope: ObsProdutoScope | null,
  scopeValue: string | null,
) {
  const enabled = !!clienteId && !!scope && !!scopeValue;
  return useQuery({
    queryKey: enabled
      ? clienteKeys.obsProduto(clienteId!, scope!, scopeValue!)
      : ["cliente", "obs-prod", "none"],
    queryFn: () => listObservacoesProduto(clienteId!, scope!, scopeValue!),
    enabled,
    staleTime: STALE,
  });
}

export function useCriarObservacaoProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarObservacaoInput) => criarObservacaoProduto(input),
    onSuccess: (obs) => {
      qc.invalidateQueries({
        queryKey: clienteKeys.obsProduto(obs.cliente_id, obs.scope, obs.scope_value),
      });
    },
  });
}