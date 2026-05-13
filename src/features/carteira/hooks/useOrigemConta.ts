import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  atualizarOrigemConta,
  criarOrigemConta,
  excluirOrigemConta,
  listarOrigemConta,
} from "../api/origemConta";

const KEY = ["carteira", "origem_conta"] as const;

export function useOrigemConta(apenasAtivos = true) {
  return useQuery({
    queryKey: [...KEY, { apenasAtivos }],
    queryFn: () => listarOrigemConta(apenasAtivos),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCriarOrigemConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nome: string) => criarOrigemConta(nome),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAtualizarOrigemConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; nome: string; ativo: boolean }) =>
      atualizarOrigemConta(p.id, p.nome, p.ativo),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useExcluirOrigemConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirOrigemConta(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
