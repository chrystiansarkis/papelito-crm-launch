import { useQuery } from "@tanstack/react-query";
import { listTabelasPreco } from "../api/listTabelasPreco";

export function useTabelasPreco() {
  return useQuery({
    queryKey: ["carteira", "lookups", "tabelas-preco"],
    queryFn: listTabelasPreco,
    staleTime: 1000 * 60 * 30,
  });
}
