import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cadastrarClienteCrm } from "../api/cadastrarCliente";
import { carteiraKeys } from "./queryKeys";
import type { NovoClienteForm } from "../schemas.cadastro";

export function useCadastrarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NovoClienteForm) => cadastrarClienteCrm(input),
    onSuccess: () => {
      // Invalida as queries da carteira. Atenção: a matview vw_carteira só
      // mostra o novo cliente depois de REFRESH MATERIALIZED VIEW (manual).
      qc.invalidateQueries({ queryKey: carteiraKeys.all });
    },
  });
}
