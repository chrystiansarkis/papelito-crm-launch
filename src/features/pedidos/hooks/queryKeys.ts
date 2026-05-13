import type { PedidoFiltro } from "../types";

export const pedidosKeys = {
  all: ["pedidos"] as const,
  kpis: () => [...pedidosKeys.all, "kpis"] as const,
  vendedores: () => [...pedidosKeys.all, "vendedores"] as const,
  lista: (filtros: PedidoFiltro) => [...pedidosKeys.all, "lista", filtros] as const,
  detalhe: (id: string) => [...pedidosKeys.all, "detalhe", id] as const,
  itens: (pedidoId: string) => [...pedidosKeys.all, "itens", pedidoId] as const,
};
