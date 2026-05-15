import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listProdutoConfig, type ListProdutoConfigInput } from "../api/listProdutoConfig";
import { salvarProdutoConfig } from "../api/salvarProdutoConfig";
import { removerProdutoConfig } from "../api/removerProdutoConfig";
import type { ProdutoConfigForm } from "../schemas.produtoConfig";

const QK = ["produto-config", "list"] as const;

export function useProdutoConfigList(input: ListProdutoConfigInput = {}) {
  return useQuery({
    queryKey: [...QK, input],
    queryFn: () => listProdutoConfig(input),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSalvarProdutoConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: ProdutoConfigForm) => salvarProdutoConfig(form),
    onSuccess: () => {
      toast.success("Configuracao salva");
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao salvar";
      toast.error(msg);
    },
  });
}

export function useRemoverProdutoConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codProduto: string) => removerProdutoConfig(codProduto),
    onSuccess: () => {
      toast.success("Configuracao removida");
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao remover";
      toast.error(msg);
    },
  });
}
