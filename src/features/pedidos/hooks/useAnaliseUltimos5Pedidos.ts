// Mitigates: A10 (erros sobem para react-query; UI lida graciosamente)
import { useQuery } from "@tanstack/react-query";
import { getAnaliseUltimos5Pedidos } from "../api/analiseUltimos5Pedidos";

export function useAnaliseUltimos5Pedidos(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["orcamentos", "analise5", clienteId ?? ""],
    queryFn: () => getAnaliseUltimos5Pedidos(clienteId as string),
    enabled: !!clienteId,
    staleTime: 1000 * 60 * 5,
  });
}
