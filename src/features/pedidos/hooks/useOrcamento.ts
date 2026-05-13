// Mitigates: A10 (erros do supabase sobem para react-query; UI mostra mensagem
//            generica)
import { useQuery } from "@tanstack/react-query";
import {
  getOrcamento,
  listOrcamentoItens,
  listOrcamentos,
  type ListOrcamentosFilter,
} from "../api/getOrcamento";

export const orcamentosKeys = {
  all: ["orcamentos"] as const,
  detalhe: (id: string) => [...orcamentosKeys.all, "detalhe", id] as const,
  itens: (id: string) => [...orcamentosKeys.all, "itens", id] as const,
  lista: (filter: ListOrcamentosFilter) =>
    [...orcamentosKeys.all, "lista", filter] as const,
};

export function useOrcamento(id: string | undefined) {
  return useQuery({
    queryKey: orcamentosKeys.detalhe(id ?? ""),
    queryFn: () => getOrcamento(id as string),
    enabled: !!id,
  });
}

export function useOrcamentoItens(id: string | undefined) {
  return useQuery({
    queryKey: orcamentosKeys.itens(id ?? ""),
    queryFn: () => listOrcamentoItens(id as string),
    enabled: !!id,
  });
}

export function useOrcamentosLista(filter: ListOrcamentosFilter) {
  return useQuery({
    queryKey: orcamentosKeys.lista(filter),
    queryFn: () => listOrcamentos(filter),
    placeholderData: (prev) => prev,
  });
}
