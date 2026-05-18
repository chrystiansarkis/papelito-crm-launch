import { useQuery } from "@tanstack/react-query";
import { clienteKeys } from "./queryKeys";
import { getCrescimentoDecomp } from "../api/getCrescimentoDecomp";

export function useCrescimentoDecomp(
  clienteId: string | undefined,
  periodoA: [string, string],
  periodoB: [string, string],
) {
  return useQuery({
    queryKey: clienteId
      ? clienteKeys.crescimentoDecomp(clienteId, periodoA, periodoB)
      : ["cliente", "crescimento-decomp", "none"],
    queryFn: () => getCrescimentoDecomp(clienteId as string, periodoA, periodoB),
    enabled: !!clienteId && !!periodoA[0] && !!periodoB[0],
    staleTime: 1000 * 60 * 5,
  });
}
