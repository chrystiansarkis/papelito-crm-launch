import { useQuery } from "@tanstack/react-query";
import {
  listContatosCliente,
  listResponsaveisAtivos,
  searchClientesAtendimento,
} from "../api/lookups";

export function useResponsaveisLookup() {
  return useQuery({
    queryKey: ["atendimentos", "lookups", "responsaveis"],
    queryFn: () => listResponsaveisAtivos(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useClientesLookupAtd(term: string) {
  return useQuery({
    queryKey: ["atendimentos", "lookups", "clientes", term],
    queryFn: () => searchClientesAtendimento(term),
    staleTime: 1000 * 30,
  });
}

export function useContatosClienteLookup(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["atendimentos", "lookups", "contatos", clienteId ?? ""],
    queryFn: () => listContatosCliente(clienteId as string),
    enabled: !!clienteId,
    staleTime: 1000 * 60,
  });
}
