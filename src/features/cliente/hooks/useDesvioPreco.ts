import { useQuery } from "@tanstack/react-query";
import { clienteKeys } from "./queryKeys";
import { listClienteDesvioPreco } from "../api/listDesvioPreco";

export function useClienteDesvioPreco(id: string | undefined) {
  return useQuery({
    queryKey: id ? clienteKeys.desvioPreco(id) : ["cliente", "desvio-preco", "none"],
    queryFn: () => listClienteDesvioPreco(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
