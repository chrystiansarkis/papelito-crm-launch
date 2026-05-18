import type { CampanhaFiltro } from "../types";

export const campanhasVendasKeys = {
  all: ["campanhas-vendas"] as const,
  lista: (filtro: CampanhaFiltro) =>
    [...campanhasVendasKeys.all, "lista", filtro] as const,
  detalhe: (id: string) => [...campanhasVendasKeys.all, "detalhe", id] as const,
  lookups: () => [...campanhasVendasKeys.all, "lookups"] as const,
  contatosCliente: (clienteId: string) =>
    [...campanhasVendasKeys.lookups(), "contatos", clienteId] as const,
  prePos: (dataInicio: string, clienteIds: string[], codProdutos: string[]) =>
    [
      ...campanhasVendasKeys.all,
      "pre-pos",
      dataInicio,
      clienteIds.slice().sort().join(","),
      codProdutos.slice().sort().join(","),
    ] as const,
};
