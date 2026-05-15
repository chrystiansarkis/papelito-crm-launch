import { useQuery } from "@tanstack/react-query";
import { getClienteProtheusStatus } from "../api/getClienteProtheusStatus";

export function useClienteProtheusStatus(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["cliente", clienteId, "protheus-status"],
    queryFn: () => getClienteProtheusStatus(clienteId as string),
    enabled: !!clienteId,
    staleTime: 1000 * 10,
  });
}
