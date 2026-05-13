import { useQuery } from "@tanstack/react-query";
import { listUfs, searchCidades, searchClientesMatriz } from "../api/lookups";

export function useUfs() {
  return useQuery({
    queryKey: ["carteira", "lookups", "ufs"],
    queryFn: listUfs,
    staleTime: 1000 * 60 * 60, // UFs raramente mudam
  });
}

export function useCidades(uf: string, term: string) {
  return useQuery({
    queryKey: ["carteira", "lookups", "cidades", uf, term],
    queryFn: () => searchCidades(uf, term),
    enabled: !!uf,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMatrizSearch(term: string) {
  return useQuery({
    queryKey: ["carteira", "lookups", "matriz", term],
    queryFn: () => searchClientesMatriz(term),
    staleTime: 1000 * 30,
  });
}
