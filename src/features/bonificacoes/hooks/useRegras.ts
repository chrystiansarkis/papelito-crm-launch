import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  associarClientesRegra,
  definirRegrasCliente,
  desassociarClienteRegra,
  desativarRegra,
  listClientesRegra,
  listRegras,
  listRegrasCliente,
  salvarRegra,
  sugerirBonificacao,
} from "../api/regras";
import type { RegraForm } from "../schemas.regra";

const qkList = ["bonificacao-regras", "list"] as const;
const qkClientesRegra = (regraId: string) =>
  ["bonificacao-regras", "clientes", regraId] as const;
const qkRegrasDoCliente = (clienteId: string) =>
  ["bonificacao-regras", "do-cliente", clienteId] as const;
const qkSugestao = (orcId: string) => ["bonificacao", "sugestao", orcId] as const;

export function useRegras() {
  return useQuery({
    queryKey: qkList,
    queryFn: listRegras,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSalvarRegra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: RegraForm) => salvarRegra(form),
    onSuccess: () => {
      toast.success("Regra salva");
      qc.invalidateQueries({ queryKey: qkList });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao salvar";
      toast.error(msg);
    },
  });
}

export function useDesativarRegra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => desativarRegra(id),
    onSuccess: () => {
      toast.success("Regra desativada");
      qc.invalidateQueries({ queryKey: qkList });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao desativar";
      toast.error(msg);
    },
  });
}

export function useSugestaoBonificacao(orcamentoId: string | undefined) {
  return useQuery({
    queryKey: qkSugestao(orcamentoId ?? ""),
    queryFn: () => sugerirBonificacao(orcamentoId!),
    enabled: !!orcamentoId,
    staleTime: 1000 * 30,
  });
}

// ============ Clientes de uma regra ============

export function useClientesRegra(regraId: string | undefined) {
  return useQuery({
    queryKey: qkClientesRegra(regraId ?? ""),
    queryFn: () => listClientesRegra(regraId!),
    enabled: !!regraId,
    staleTime: 1000 * 30,
  });
}

export function useAssociarClientesRegra(regraId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (identificadores: string[]) =>
      associarClientesRegra(regraId!, identificadores),
    onSuccess: (r) => {
      const partes: string[] = [];
      if (r.total_inseridos) partes.push(`${r.total_inseridos} inserido(s)`);
      if (r.total_duplicados) partes.push(`${r.total_duplicados} duplicado(s)`);
      if (r.total_nao_encontrados)
        partes.push(`${r.total_nao_encontrados} nao encontrado(s)`);
      toast.success(partes.join(" · ") || "Sem alteracoes");
      if (regraId) {
        qc.invalidateQueries({ queryKey: qkClientesRegra(regraId) });
        qc.invalidateQueries({ queryKey: qkList });
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Falha ao associar");
    },
  });
}

export function useDesassociarClienteRegra(regraId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clienteId: string) =>
      desassociarClienteRegra(regraId!, clienteId),
    onSuccess: () => {
      toast.success("Cliente removido da regra");
      if (regraId) {
        qc.invalidateQueries({ queryKey: qkClientesRegra(regraId) });
        qc.invalidateQueries({ queryKey: qkList });
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    },
  });
}

// ============ Regras de um cliente (uso em CarteiraNovo) ============

export function useRegrasDoCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: qkRegrasDoCliente(clienteId ?? ""),
    queryFn: () => listRegrasCliente(clienteId!),
    enabled: !!clienteId,
    staleTime: 1000 * 60,
  });
}

export function useDefinirRegrasCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { clienteId: string; regraIds: string[] }) =>
      definirRegrasCliente(args.clienteId, args.regraIds),
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: qkRegrasDoCliente(args.clienteId) });
      qc.invalidateQueries({ queryKey: qkList });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar regras");
    },
  });
}
