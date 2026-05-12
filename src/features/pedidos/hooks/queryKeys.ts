import type { PedidoFiltro } from "../types";

export const pedidosKeys = {
  all: ["pedidos"] as const,
  kpis: () => [...pedidosKeys.all, "kpis"] as const,
  vendedores: () => [...pedidosKeys.all, "vendedores"] as const,
  lista: (filtros: PedidoFiltro) => [...pedidosKeys.all, "lista", filtros] as const,
};
