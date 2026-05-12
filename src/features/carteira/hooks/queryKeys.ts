import type { CarteiraFiltro } from "../types";

export const carteiraKeys = {
  all: ["carteira"] as const,
  kpis: () => [...carteiraKeys.all, "kpis"] as const,
  vendedores: () => [...carteiraKeys.all, "vendedores"] as const,
  lista: (filtros: CarteiraFiltro) => [...carteiraKeys.all, "lista", filtros] as const,
};
