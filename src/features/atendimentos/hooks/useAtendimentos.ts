// Mitigates: A10 (erros do supabase propagam para react-query; UI mostra generico).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAtendimentos } from "../api/listAtendimentos";
import { salvarAtendimento } from "../api/salvarAtendimento";
import { excluirAtendimento } from "../api/excluirAtendimento";
import type { AtendimentoFiltro } from "../types";
import type { SalvarAtendimentoForm } from "../schemas";

export const atendimentosKeys = {
  all: ["atendimentos"] as const,
  lista: (f: AtendimentoFiltro) => ["atendimentos", "lista", f] as const,
};

export function useAtendimentosLista(filtro: AtendimentoFiltro) {
  return useQuery({
    queryKey: atendimentosKeys.lista(filtro),
    queryFn: () => listAtendimentos(filtro),
    staleTime: 1000 * 30,
  });
}

export function useSalvarAtendimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SalvarAtendimentoForm) => salvarAtendimento(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: atendimentosKeys.all });
    },
  });
}

export function useExcluirAtendimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirAtendimento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: atendimentosKeys.all });
    },
  });
}
