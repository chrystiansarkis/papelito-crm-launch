import { useQuery } from "@tanstack/react-query";
import { inicioKeys } from "./queryKeys";
import { getInicioKpis } from "../api/getInicioKpis";
import { listFaturamentoMensal } from "../api/listFaturamentoMensal";
import { listTopSemana } from "../api/listTopSemana";
import { listEmRisco } from "../api/listEmRisco";

export function useInicioKpis() {
  return useQuery({ queryKey: inicioKeys.kpis(), queryFn: getInicioKpis });
}
export function useFaturamentoMensal() {
  return useQuery({ queryKey: inicioKeys.mensal(), queryFn: listFaturamentoMensal });
}
export function useTopSemana() {
  return useQuery({ queryKey: inicioKeys.topSemana(), queryFn: listTopSemana });
}
export function useEmRisco() {
  return useQuery({ queryKey: inicioKeys.emRisco(), queryFn: listEmRisco });
}
