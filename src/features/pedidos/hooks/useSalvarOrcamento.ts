// Mitigates: A10 (erros do supabase chegam a UI via toast generico)
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { salvarOrcamento } from "../api/salvarOrcamento";
import { orcamentosKeys } from "./useOrcamento";
import type { SalvarOrcamentoForm } from "../schemas.orcamento";

export function useSalvarOrcamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SalvarOrcamentoForm) => salvarOrcamento(input),
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: orcamentosKeys.all });
      if (id) {
        qc.invalidateQueries({ queryKey: orcamentosKeys.detalhe(id) });
        qc.invalidateQueries({ queryKey: orcamentosKeys.itens(id) });
      }
    },
  });
}
