import { useQuery } from "@tanstack/react-query";
import { clienteKeys } from "./queryKeys";
import { getDreCliente } from "../api/getDreCliente";
import { getDreMensalCliente } from "../api/getDreMensalCliente";
import type { DreRegime } from "../types";

export function useDreCliente(
  clienteId: string | undefined,
  periodo: [string, string],
  regime: DreRegime,
) {
  return useQuery({
    queryKey: clienteId
      ? clienteKeys.dre(clienteId, periodo, regime)
      : ["cliente", "dre", "none"],
    queryFn: () => getDreCliente(clienteId as string, periodo, regime),
    enabled: !!clienteId && !!periodo[0] && !!periodo[1],
    staleTime: 1000 * 60 * 5,
  });
}

export function useDreMensalCliente(
  clienteId: string | undefined,
  periodo: [string, string],
  regime: DreRegime,
  enabled: boolean,
) {
  return useQuery({
    queryKey: clienteId
      ? clienteKeys.dreMensal(clienteId, periodo, regime)
      : ["cliente", "dre-mensal", "none"],
    queryFn: () => getDreMensalCliente(clienteId as string, periodo, regime),
    enabled: enabled && !!clienteId && !!periodo[0] && !!periodo[1],
    staleTime: 1000 * 60 * 5,
  });
}
