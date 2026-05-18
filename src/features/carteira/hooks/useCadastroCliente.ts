// Mitigates: A10 (erros sobem pra react-query)
import { useQuery } from "@tanstack/react-query";
import { getCadastroCliente } from "../api/getCadastroCliente";

export function useCadastroCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["carteira", "cadastro", clienteId ?? ""],
    queryFn: () => getCadastroCliente(clienteId as string),
    enabled: !!clienteId,
    staleTime: 1000 * 60 * 5,
  });
}
