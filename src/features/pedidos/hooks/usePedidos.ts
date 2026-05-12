// Mitigates: A10 (erros do supabase sobem para react-query; UI mostra mensagem genérica)
import { useQuery } from "@tanstack/react-query";
import { listPedidos, listVendedoresPedidos } from "../api/listPedidos";
import { getPedidosKpis } from "../api/getPedidosKpis";
import { pedidosKeys } from "./queryKeys";
import type { PedidoFiltro } from "../types";

export function usePedidosKpis() {
  return useQuery({
    queryKey: pedidosKeys.kpis(),
    queryFn: getPedidosKpis,
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
