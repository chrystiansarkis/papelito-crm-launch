import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCampanhas } from "../api/listCampanhas";
import { getCampanha } from "../api/getCampanha";
import { salvarCampanha } from "../api/salvarCampanha";
import { transicionarCampanha, type TransicaoInput } from "../api/transicionarCampanha";
import { apurarCampanha } from "../api/apurarCampanha";
import { encerrarCampanha } from "../api/encerrarCampanha";
import { getCampanhaPrePos } from "../api/getCampanhaPrePos";
import { campanhasVendasKeys } from "./queryKeys";
import type { Campanha, CampanhaFiltro } from "../types";

export function useCampanhas(filtro: CampanhaFiltro) {
  return useQuery({
    queryKey: campanhasVendasKeys.lista(filtro),
    queryFn: () => listCampanhas(filtro),
    placeholderData: (prev) => prev,
  });
}

export function useCampanha(id: string | undefined) {
  return useQuery({
    queryKey: campanhasVendasKeys.detalhe(id ?? ""),
    queryFn: () => getCampanha(id as string),
    enabled: !!id,
  });
}

export function useSalvarCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Campanha) => salvarCampanha(input),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: campanhasVendasKeys.all });
      qc.setQueryData(campanhasVendasKeys.detalhe(c.id), c);
    },
  });
}

export function useTransicionarCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransicaoInput) => transicionarCampanha(input),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: campanhasVendasKeys.all });
      qc.setQueryData(campanhasVendasKeys.detalhe(c.id), c);
    },
  });
}

export function useApurarCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apurarCampanha(id),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: campanhasVendasKeys.all });
      qc.setQueryData(campanhasVendasKeys.detalhe(c.id), c);
    },
  });
}

export function useCampanhaPrePos(args: {
  dataInicio: string | null | undefined;
  clienteIds: string[];
  codProdutos?: string[];
  enabled?: boolean;
}) {
  const codProdutos = args.codProdutos ?? [];
  const ativo =
    (args.enabled ?? true) && !!args.dataInicio && args.clienteIds.length > 0;
  return useQuery({
    queryKey: campanhasVendasKeys.prePos(
      args.dataInicio ?? "",
      args.clienteIds,
      codProdutos,
    ),
    queryFn: () =>
      getCampanhaPrePos({
        dataInicio: args.dataInicio as string,
        clienteIds: args.clienteIds,
        codProdutos,
      }),
    enabled: ativo,
  });
}

export function useEncerrarCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => encerrarCampanha(id),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: campanhasVendasKeys.all });
      qc.setQueryData(campanhasVendasKeys.detalhe(c.id), c);
    },
  });
}
