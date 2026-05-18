import { useQuery } from "@tanstack/react-query";
import { clienteKeys } from "./queryKeys";
import { getClienteFicha } from "../api/getFicha";
import { listClientePedidos } from "../api/listPedidos";
import { listClienteContatos } from "../api/listContatos";
import { listClienteObservacoes } from "../api/listObservacoes";
import { listClienteTitulos } from "../api/listTitulos";
import { listPedidoNotaMap } from "../api/listPedidoNotaMap";

export function useClienteFicha(id: string | undefined) {
  return useQuery({
    queryKey: id ? clienteKeys.ficha(id) : ["cliente", "ficha", "none"],
    queryFn: () => getClienteFicha(id as string),
    enabled: !!id,
  });
}

export function useClientePedidos(id: string | undefined) {
  return useQuery({
    queryKey: id ? clienteKeys.pedidos(id) : ["cliente", "pedidos", "none"],
    queryFn: () => listClientePedidos(id as string),
    enabled: !!id,
  });
}

export function useClienteContatos(id: string | undefined) {
  return useQuery({
    queryKey: id ? clienteKeys.contatos(id) : ["cliente", "contatos", "none"],
    queryFn: () => listClienteContatos(id as string),
    enabled: !!id,
  });
}

export function useClienteObservacoes(id: string | undefined) {
  return useQuery({
    queryKey: id ? clienteKeys.observacoes(id) : ["cliente", "observacoes", "none"],
    queryFn: () => listClienteObservacoes(id as string),
    enabled: !!id,
  });
}

export function useClienteTitulos(id: string | undefined) {
  return useQuery({
    queryKey: id ? clienteKeys.titulos(id) : ["cliente", "titulos", "none"],
    queryFn: () => listClienteTitulos(id as string),
    enabled: !!id,
  });
}

export function usePedidoNotaMap(id: string | undefined) {
  return useQuery({
    queryKey: id ? clienteKeys.pedidoNotaMap(id) : ["cliente", "pedido-nota-map", "none"],
    queryFn: () => listPedidoNotaMap(id as string),
    enabled: !!id,
  });
}
