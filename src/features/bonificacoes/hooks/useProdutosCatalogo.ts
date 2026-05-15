import { useQuery } from "@tanstack/react-query";
import { searchProdutosCatalogo } from "../api/catalogo";

export function useProdutosCatalogoSearch(term: string) {
  return useQuery({
    queryKey: ["produtos-catalogo", "search", term],
    queryFn: () => searchProdutosCatalogo(term),
    staleTime: 1000 * 30,
  });
}
