import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getBonificacaoSaldo,
  listBonificacoesCliente,
} from "../api/listBonificacoes";
import { registrarBonificacao } from "../api/registrarBonificacao";
import { baixarBonificacao, cancelarBonificacao } from "../api/baixarBonificacao";
import type {
  BaixarBonificacaoForm,
  RegistrarBonificacaoForm,
} from "../schemas.bonificacao";

const qkLista = (clienteId: string) => ["bonificacoes", "lista", clienteId] as const;
const qkSaldo = (clienteId: string) => ["bonificacoes", "saldo", clienteId] as const;

export function useBonificacoesCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: qkLista(clienteId ?? ""),
    queryFn: () => listBonificacoesCliente(clienteId!),
    enabled: !!clienteId,
    staleTime: 1000 * 60,
  });
}

export function useBonificacaoSaldo(clienteId: string | undefined) {
  return useQuery({
    queryKey: qkSaldo(clienteId ?? ""),
    queryFn: () => getBonificacaoSaldo(clienteId!),
    enabled: !!clienteId,
    staleTime: 1000 * 60,
  });
}

export function useRegistrarBonificacao(clienteId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: RegistrarBonificacaoForm) => registrarBonificacao(form),
    onSuccess: () => {
      toast.success("Bonificacao registrada");
      if (clienteId) {
        qc.invalidateQueries({ queryKey: qkLista(clienteId) });
        qc.invalidateQueries({ queryKey: qkSaldo(clienteId) });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao registrar";
      toast.error(msg);
    },
  });
}

export function useBaixarBonificacao(clienteId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: BaixarBonificacaoForm) => baixarBonificacao(form),
    onSuccess: () => {
      toast.success("Baixa registrada");
      if (clienteId) {
        qc.invalidateQueries({ queryKey: qkLista(clienteId) });
        qc.invalidateQueries({ queryKey: qkSaldo(clienteId) });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao baixar";
      toast.error(msg);
    },
  });
}

export function useCancelarBonificacao(clienteId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; motivo: string }) =>
      cancelarBonificacao(args.id, args.motivo),
    onSuccess: () => {
      toast.success("Bonificacao cancelada");
      if (clienteId) {
        qc.invalidateQueries({ queryKey: qkLista(clienteId) });
        qc.invalidateQueries({ queryKey: qkSaldo(clienteId) });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao cancelar";
      toast.error(msg);
    },
  });
}
