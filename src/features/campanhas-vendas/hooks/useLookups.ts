import { useQuery } from "@tanstack/react-query";
import {
  listClientesLookup,
  listContatosLookup,
  listGruposLookup,
  listProdutosLookup,
  listVendedoresLookup,
} from "../api/lookups";
import { campanhasVendasKeys } from "./queryKeys";

export function useVendedoresLookup() {
  return useQuery({
    queryKey: [...campanhasVendasKeys.lookups(), "vendedores"],
    queryFn: listVendedoresLookup,
    staleTime: 5 * 60_000,
  });
}

export function useClientesLookup() {
  return useQuery({
    queryKey: [...campanhasVendasKeys.lookups(), "clientes"],
    queryFn: listClientesLookup,
    staleTime: 5 * 60_000,
  });
}

export function useContatosLookup(clienteId: string | null) {
  return useQuery({
    queryKey: campanhasVendasKeys.contatosCliente(clienteId ?? ""),
    queryFn: () => listContatosLookup(clienteId as string),
    enabled: !!clienteId,
  });
}

export function useProdutosLookup() {
  return useQuery({
    queryKey: [...campanhasVendasKeys.lookups(), "produtos"],
    queryFn: listProdutosLookup,
    staleTime: 5 * 60_000,
  });
}

export function useGruposLookup() {
  return useQuery({
    queryKey: [...campanhasVendasKeys.lookups(), "grupos"],
    queryFn: listGruposLookup,
    staleTime: 5 * 60_000,
  });
}
