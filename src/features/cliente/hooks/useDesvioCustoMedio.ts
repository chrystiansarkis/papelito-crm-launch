import { useQuery } from "@tanstack/react-query";
import { clienteKeys } from "./queryKeys";
import { listClienteDesvioCustoMedio } from "../api/listDesvioCustoMedio";

export function useClienteDesvioCustoMedio(id: string | undefined) {
  return useQuery({
    queryKey: id ? clienteKeys.desvioCustoMedio(id) : ["cliente", "desvio-custo-medio", "none"],
    queryFn: () => listClienteDesvioCustoMedio(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
