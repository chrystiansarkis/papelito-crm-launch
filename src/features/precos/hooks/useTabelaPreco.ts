import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { obterTabelaPreco } from "../api/obterTabelaPreco";
import { listItensTabela } from "../api/listItensTabela";
import { salvarTabelaPreco } from "../api/salvarTabelaPreco";
import { salvarItensTabelaLote, type ItensTabelaLotePayload } from "../api/salvarItensTabelaLote";
import { removerTabelaPreco } from "../api/removerTabelaPreco";
import type { TabelaPrecoForm } from "../schemas.tabela";

const qkTabela = (id: string) => ["precos", "tabela", id] as const;
const qkItens = (id: string) => ["precos", "tabela", id, "itens"] as const;
const qkLista = ["carteira", "lookups", "tabelas-preco"] as const;

export function useTabelaPreco(id: string | null | undefined) {
  return useQuery({
    queryKey: qkTabela(id ?? ""),
    queryFn: () => obterTabelaPreco(id!),
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

export function useItensTabela(id: string | null | undefined) {
  return useQuery({
    queryKey: qkItens(id ?? ""),
    queryFn: () => listItensTabela(id!),
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

export function useSalvarTabelaPreco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: TabelaPrecoForm) => salvarTabelaPreco(form),
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: qkLista });
      qc.invalidateQueries({ queryKey: qkTabela(id) });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar tabela");
    },
  });
}

export function useSalvarItensTabelaLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ItensTabelaLotePayload) =>
      salvarItensTabelaLote(payload),
    onSuccess: (_n, variables) => {
      qc.invalidateQueries({ queryKey: qkItens(variables.tabela_preco_id) });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar itens");
    },
  });
}

export function useRemoverTabelaPreco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removerTabelaPreco(id),
    onSuccess: () => {
      toast.success("Tabela removida");
      qc.invalidateQueries({ queryKey: qkLista });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    },
  });
}
