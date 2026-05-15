// Mitigates: A01, A05 — zod no client, RPC SECURITY DEFINER re-valida no banco.
import { publicDb } from "@/lib/supabase";
import { produtoConfigSchema, type ProdutoConfigForm } from "../schemas.produtoConfig";

export async function salvarProdutoConfig(input: ProdutoConfigForm): Promise<string> {
  const safe = produtoConfigSchema.parse(input);
  const payload = {
    cod_produto: safe.cod_produto,
    somente_caixa_master: safe.somente_caixa_master,
    qtd_caixa_master: safe.qtd_caixa_master,
    observacao: safe.observacao || null,
  };
  const { data, error } = await publicDb.rpc(
    "fn_salvar_produto_config" as never,
    { payload } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}
