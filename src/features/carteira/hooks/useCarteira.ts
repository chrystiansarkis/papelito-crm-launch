import { useQuery } from "@tanstack/react-query";
import { getCarteiraKpis } from "../api/getKpis";
import { listCarteiraVendedores } from "../api/listVendedores";
import { listCarteiraClientes } from "../api/listClientes";
import { carteiraKeys } from "./queryKeys";
import type { CarteiraFiltro } from "../types";

export function useCarteiraKpis(filtros: CarteiraFiltro) {
  return useQuery({
    queryKey: [...carteiraKeys.kpis(), filtros],
    queryFn: () => getCarteiraKpis(filtros),
    placeholderData: (prev) => prev,
  });
}

export function useCarteiraVendedores() {
  return useQuery({
    queryKey: carteiraKeys.vendedores(),
    queryFn: listCarteiraVendedores,
  });
}

export function useCarteiraClientes(filtros: CarteiraFiltro) {
  return useQuery({
    queryKey: carteiraKeys.lista(filtros),
    queryFn: () => listCarteiraClientes(filtros),
    placeholderData: (prev) => prev,
  });
}
