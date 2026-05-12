import { useQuery } from "@tanstack/react-query";
import { cobrancaKeys } from "./queryKeys";
import { getCobrancaKpis } from "../api/getCobrancaKpis";
import { listCobrancaClientes } from "../api/listCobrancaClientes";
import { listCobrancaVendedores } from "../api/listVendedores";
import { listAcordos } from "../api/listAcordos";
import { listPromessas } from "../api/listPromessas";
import { getReguaKpis } from "../api/getReguaKpis";
import {
  listReguaPassos,
  listReguaProximas,
  listReguaHistorico,
} from "../api/listRegua";
import type { CobrancaCarteiraFiltro } from "../types";

export function useCobrancaKpis() {
  return useQuery({ queryKey: cobrancaKeys.kpis(), queryFn: getCobrancaKpis });
}

export function useCobrancaVendedores() {
  return useQuery({ queryKey: cobrancaKeys.vendedores(), queryFn: listCobrancaVendedores });
}

export function useCobrancaClientes(filtros: CobrancaCarteiraFiltro) {
  return useQuery({
    queryKey: cobrancaKeys.clientes(filtros),
    queryFn: () => listCobrancaClientes(filtros),
    placeholderData: (prev) => prev,
  });
}

export function useAcordos(enabled: boolean) {
  return useQuery({ queryKey: cobrancaKeys.acordos(), queryFn: listAcordos, enabled });
}

export function usePromessas(enabled: boolean) {
  return useQuery({ queryKey: cobrancaKeys.promessas(), queryFn: listPromessas, enabled });
}

export function useReguaKpis(enabled: boolean) {
  return useQuery({ queryKey: cobrancaKeys.reguaKpis(), queryFn: getReguaKpis, enabled });
}

export function useReguaPassos(enabled: boolean) {
  return useQuery({ queryKey: cobrancaKeys.reguaPassos(), queryFn: listReguaPassos, enabled });
}

export function useReguaProximas(enabled: boolean) {
  return useQuery({ queryKey: cobrancaKeys.reguaProximas(), queryFn: listReguaProximas, enabled });
}

export function useReguaHistorico(enabled: boolean) {
  return useQuery({
    queryKey: cobrancaKeys.reguaHistorico(),
    queryFn: listReguaHistorico,
    enabled,
  });
}
