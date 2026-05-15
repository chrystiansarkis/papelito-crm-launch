import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enviarClienteProtheus, type ProtheusSyncResult } from "../api/protheus";

// Forca re-envio do cliente ao Protheus (mesmo se ja estiver 'ok').
// mutationKey por clienteId garante 1 inflight por cliente — re-cliques
// durante a request sao no-op pelo React Query.
export function useForcarSyncProtheus(clienteId: string) {
  const qc = useQueryClient();
  return useMutation<ProtheusSyncResult, Error, void>({
    mutationKey: ["protheus-sync", clienteId],
    mutationFn: () => enviarClienteProtheus(clienteId, { force: true }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["cliente", clienteId] });
      qc.invalidateQueries({ queryKey: ["carteira"] });
    },
  });
}
