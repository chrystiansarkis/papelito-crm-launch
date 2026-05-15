import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listDescontos } from "../api/listDescontos";
import { salvarDesconto } from "../api/salvarDesconto";
import { removerDesconto } from "../api/removerDesconto";
import { listGruposArvore } from "../api/listGruposArvore";
import { listClientesTabela, listDescontoClientes } from "../api/listClientesTabela";
import type { DescontoForm } from "../schemas.desconto";

const qkDescontos = (tabelaId: string) => ["precos", "descontos", tabelaId] as const;
const qkGrupos = ["precos", "grupos-arvore"] as const;
const qkClientesTabela = (ids: string[]) =>
  ["precos", "clientes-tabela", [...ids].sort().join(",")] as const;
const qkDescontoClientes = (descontoId: string) =>
  ["precos", "desconto-clientes", descontoId] as const;

export function useDescontos(tabelaId: string | undefined) {
  return useQuery({
    queryKey: qkDescontos(tabelaId ?? ""),
    queryFn: () => listDescontos(tabelaId!),
    enabled: !!tabelaId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGruposArvore() {
  return useQuery({
    queryKey: qkGrupos,
    queryFn: listGruposArvore,
    staleTime: 1000 * 60 * 30,
  });
}

export function useSalvarDesconto(tabelaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: DescontoForm) => salvarDesconto(form),
    onSuccess: () => {
      toast.success("Desconto salvo");
      if (tabelaId) qc.invalidateQueries({ queryKey: qkDescontos(tabelaId) });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao salvar";
      toast.error(msg);
    },
  });
}

export function useRemoverDesconto(tabelaId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removerDesconto(id),
    onSuccess: () => {
      toast.success("Desconto removido");
      if (tabelaId) qc.invalidateQueries({ queryKey: qkDescontos(tabelaId) });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao remover";
      toast.error(msg);
    },
  });
}

export function useClientesTabela(tabelaPrecoIds: string[]) {
  const ids = [...tabelaPrecoIds].filter(Boolean);
  return useQuery({
    queryKey: qkClientesTabela(ids),
    queryFn: () => listClientesTabela(ids),
    enabled: ids.length > 0,
    staleTime: 1000 * 60 * 2,
  });
}

export function useDescontoClientes(descontoId: string | null | undefined) {
  return useQuery({
    queryKey: qkDescontoClientes(descontoId ?? ""),
    queryFn: () => listDescontoClientes(descontoId!),
    enabled: !!descontoId,
    staleTime: 1000 * 60,
  });
}
