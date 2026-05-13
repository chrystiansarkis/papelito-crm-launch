// Mitigates: A10 (erros sobem para react-query)
import { useMutation } from "@tanstack/react-query";
import { enviarEmailOrcamento } from "../api/enviarEmailOrcamento";
import type { EnviarEmailOrcamentoForm } from "../schemas.orcamento";

export function useEnviarEmailOrcamento() {
  return useMutation({
    mutationFn: (input: EnviarEmailOrcamentoForm) => enviarEmailOrcamento(input),
  });
}
