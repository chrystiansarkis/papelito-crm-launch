import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertContato, type UpsertContatoInput } from "../api/upsertContato";
import { arquivarContato } from "../api/arquivarContato";
import { clienteKeys } from "./queryKeys";

export function useUpsertContato(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertContatoInput) => upsertContato(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clienteKeys.contatos(clienteId) });
    },
  });
}

export function useArquivarContato(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string | null }) =>
      arquivarContato(id, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clienteKeys.contatos(clienteId) });
    },
  });
}
