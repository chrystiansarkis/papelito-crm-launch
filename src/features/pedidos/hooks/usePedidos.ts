// Mitigates: A10 (erros do supabase sobem para react-query; UI mostra mensagem genérica)
import { useQuery } from "@tanstack/react-query";
import { listPedidos, listVendedoresPedidos } from "../api/listPedidos";
import { getPedidosKpis } from "../api/getPedidosKpis";
import { getPedido } from "../api/getPedido";
import { listPedidoItens } from "../api/listPedidoItens";
import { pedidosKeys } from "./queryKeys";
import type { PedidoFiltro } from "../types";

export function usePedidosKpis(filtros: PedidoFiltro) {
  return useQuery({
    queryKey: [...pedidosKeys.kpis(), filtros],
    queryFn: () => getPedidosKpis(filtros),
    placeholderData: (prev) => prev,
  });
}

export function usePedidosVendedores() {
  return useQuery({
    queryKey: pedidosKeys.vendedores(),
    queryFn: listVendedoresPedidos,
  });
}

export function usePedidosLista(filtros: PedidoFiltro) {
  return useQuery({
    queryKey: pedidosKeys.lista(filtros),
    queryFn: () => listPedidos(filtros),
    placeholderData: (prev) => prev,
  });
}

export function usePedido(id: string | undefined) {
  return useQuery({
    queryKey: pedidosKeys.detalhe(id ?? ""),
    queryFn: () => getPedido(id as string),
    enabled: !!id,
  });
}

export function usePedidoItens(pedidoId: string | undefined) {
  return useQuery({
    queryKey: pedidosKeys.itens(pedidoId ?? ""),
    queryFn: () => listPedidoItens(pedidoId as string),
    enabled: !!pedidoId,
  });
}
